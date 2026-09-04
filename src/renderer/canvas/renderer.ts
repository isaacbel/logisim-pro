/**
 * High-Performance HTML5 2D Canvas Renderer for Digital Circuits
 * Professional Logisim-style engineering symbol & interactive wiring renderer.
 */

import { SignalValue } from '@apptypes/core';
import type { Point2D, CircuitComponent, Wire, RenderStats, RoutingMode } from '@apptypes/core';
import { EventEmitter } from 'eventemitter3';
import { useAppStore } from '@state/store';
import { nanoid } from 'nanoid';
import { createComponent, isValidWireConnection } from '@core/components/factory';
import {
  routeWire,
  snapPointToGrid,
  isPointNearWire,
  buildPathThroughWaypoints,
  getDistanceToSegment,
} from '@engine/routing/wireRouter';
import { simulationService } from '@/services/SimulationService';
import { getPinWorldPosition, getComponentWorldBounds } from '@utils/math';

const SIGNAL_HEX: Record<SignalValue, string> = {
  [SignalValue.LOW]: '#3b82f6',
  [SignalValue.HIGH]: '#10b981',
  [SignalValue.UNKNOWN]: '#6b7280',
  [SignalValue.FLOATING]: '#f59e0b',
  [SignalValue.ERROR]: '#ef4444',
};

interface DragState {
  origins: Map<string, { x: number; y: number }>;
  pointerStart: Point2D;
  grabOffset: Point2D;
  dx: number;
  dy: number;
}

interface WaypointDragState {
  wireId: string;
  waypointIndex: number;
  originalPos: Point2D;
  currentPos: Point2D;
}

export class CircuitRenderer extends EventEmitter {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Viewport
  private panX = 0;
  private panY = 0;
  private scale = 1;

  // Interaction
  private isPanning = false;
  private lastPanScreen = { x: 0, y: 0 };
  private drag: DragState | null = null;

  // Box Selection
  private isBoxSelecting = false;
  private boxSelectStart: Point2D | null = null;

  // Wire Creation & Custom Routing
  private wireStartPinId: string | null = null;
  private wireStartPos: Point2D | null = null;
  private wireWaypoints: Point2D[] = [];
  private currentPointerWorld: Point2D = { x: 0, y: 0 };
  private hoveredPin: { compId: string; pinId: string; pos: Point2D; isValid: boolean } | null = null;
  private waypointDrag: WaypointDragState | null = null;

  private pressedButtonComponentId: string | null = null;

  private stats: RenderStats = {
    fps: 60, componentCount: 0, wireCount: 0,
    drawCalls: 0, lastFrameTime: performance.now(),
  };

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.setupResizeObserver();
    this.resize();
    this.setupListeners();
    this.startLoop();
  }

  private setupResizeObserver() {
    const canvas = this.canvas;
    if (!canvas) return;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    const parent = canvas.parentElement;
    if (parent) this.resizeObserver.observe(parent);
  }

  private resize() {
    const canvas = this.canvas;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  private startLoop() {
    const render = (t: number) => {
      const dt = t - this.stats.lastFrameTime;
      this.stats.lastFrameTime = t;
      this.stats.fps = Math.min(999, Math.round(1000 / Math.max(1, dt)));
      this.renderFrame();
      this.emit('stats', { ...this.stats });
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  private screenToWorld(sx: number, sy: number): Point2D {
    return {
      x: (sx - this.panX) / this.scale,
      y: (sy - this.panY) / this.scale,
    };
  }

  private getCanvasRelative(e: PointerEvent | MouseEvent | WheelEvent): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private getVisualPosition(c: CircuitComponent): { x: number; y: number } {
    if (!this.drag || !this.drag.origins.has(c.id)) {
      return { x: c.transform.x, y: c.transform.y };
    }
    const origin = this.drag.origins.get(c.id)!;
    const gs = useAppStore.getState().viewport.gridSize;
    const rawX = origin.x + this.drag.dx;
    const rawY = origin.y + this.drag.dy;
    return {
      x: Math.round(rawX / gs) * gs,
      y: Math.round(rawY / gs) * gs,
    };
  }

  private withVisualPos(c: CircuitComponent): CircuitComponent {
    if (!this.drag || !this.drag.origins.has(c.id)) return c;
    const pos = this.getVisualPosition(c);
    return {
      ...c,
      transform: { ...c.transform, x: pos.x, y: pos.y },
    };
  }

  // ── Render Cycle ──────────────────────────────────────────────────────────
  private renderFrame() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width;
    const H = canvas.height;
    if (W === 0 || H === 0) return;

    const store = useAppStore.getState();
    const { project, currentCircuitId, selection, theme, viewport } = store;
    this.panX = viewport.transform.x;
    this.panY = viewport.transform.y;
    this.scale = viewport.transform.scale;

    const circuit = project?.circuits.find(c => c.id === currentCircuitId);
    const rawComponents = circuit?.components ?? [];
    const wires = circuit?.wires ?? [];

    const components = rawComponents.map(c => this.withVisualPos(c));

    this.stats.componentCount = components.length;
    this.stats.wireCount = wires.length;

    const bgColors: Record<string, string> = {
      dark: '#0f1117', light: '#f8fafc', glass: '#0a0f1e',
    };
    ctx.fillStyle = bgColors[theme] ?? '#0f1117';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // ── 0. Viewport Culling Bounds ──────────────────────────────────────────
    const screenW = W / dpr;
    const screenH = H / dpr;
    const minWorldX = -this.panX / this.scale;
    const minWorldY = -this.panY / this.scale;
    const maxWorldX = (-this.panX + screenW) / this.scale;
    const maxWorldY = (-this.panY + screenH) / this.scale;

    // 20% overscan margin so components smoothly enter viewport
    const marginX = (maxWorldX - minWorldX) * 0.2;
    const marginY = (maxWorldY - minWorldY) * 0.2;

    const visibleMinX = minWorldX - marginX;
    const visibleMaxX = maxWorldX + marginX;
    const visibleMinY = minWorldY - marginY;
    const visibleMaxY = maxWorldY + marginY;

    // 1. Grid
    this.drawGrid(ctx, screenW, screenH, theme, viewport.gridSize);

    // 2. Wires (culled)
    wires.forEach(w => {
      let isVisible = false;
      for (const seg of w.segments) {
        const segMinX = Math.min(seg.from.x, seg.to.x);
        const segMaxX = Math.max(seg.from.x, seg.to.x);
        const segMinY = Math.min(seg.from.y, seg.to.y);
        const segMaxY = Math.max(seg.from.y, seg.to.y);
        if (segMaxX >= visibleMinX && segMinX <= visibleMaxX &&
            segMaxY >= visibleMinY && segMinY <= visibleMaxY) {
          isVisible = true;
          break;
        }
      }
      if (!isVisible && w.segments.length > 0) return;

      const isSelected = selection.selectedWireIds.has(w.id);
      this.drawWire(ctx, w, components, isSelected);
    });

    // 3. Wire creation live preview
    if (this.wireStartPos) {
      this.drawWirePreview(ctx, viewport.gridSize);
    }

    // 4. Components (culled)
    components.forEach(c => {
      const bounds = getComponentWorldBounds(c);
      if (
        bounds.x + bounds.width < visibleMinX ||
        bounds.x > visibleMaxX ||
        bounds.y + bounds.height < visibleMinY ||
        bounds.y > visibleMaxY
      ) {
        return; // Culled out of viewport
      }

      const isSelected = selection.selectedEntityIds.has(c.id);
      this.drawComponent(ctx, c, isSelected);
    });

    // 5. Pin snap highlight
    if (this.hoveredPin) {
      ctx.beginPath();
      ctx.arc(this.hoveredPin.pos.x, this.hoveredPin.pos.y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = this.hoveredPin.isValid ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 6. Selection box
    if (selection.selectionBox) {
      const sb = selection.selectionBox;
      ctx.fillStyle = 'rgba(59,130,246,0.15)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(sb.x, sb.y, sb.width, sb.height);
      ctx.strokeRect(sb.x, sb.y, sb.width, sb.height);
      ctx.setLineDash([]);
    }

    ctx.restore();

    const selCount = selection.selectedEntityIds.size + selection.selectedWireIds.size;
    if (selCount > 1) {
      ctx.fillStyle = 'rgba(59,130,246,0.85)';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${selCount} items selected`, 12, 12);
    }
    ctx.restore();
  }

  // ── High-Performance Batched Grid Drawing ──────────────────────────────────
  private drawGrid(ctx: CanvasRenderingContext2D, screenW: number, screenH: number, theme: string, gs: number) {
    const startX = Math.floor(-this.panX / (this.scale * gs)) * gs - gs;
    const endX = startX + (screenW / this.scale) + gs * 2;
    const startY = Math.floor(-this.panY / (this.scale * gs)) * gs - gs;
    const endY = startY + (screenH / this.scale) + gs * 2;
    const majorEvery = 5;
    const dotColor = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
    const majorColor = theme === 'light' ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.10)';
    const dotRadius = Math.max(0.5, 1 / this.scale);

    // Batch 1: Minor Dots
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gs) {
      for (let y = startY; y <= endY; y += gs) {
        const isMajor = (Math.round(x / gs) % majorEvery === 0) && (Math.round(y / gs) % majorEvery === 0);
        if (!isMajor) {
          ctx.moveTo(x + dotRadius, y);
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();

    // Batch 2: Major Dots
    ctx.fillStyle = majorColor;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gs) {
      for (let y = startY; y <= endY; y += gs) {
        const isMajor = (Math.round(x / gs) % majorEvery === 0) && (Math.round(y / gs) % majorEvery === 0);
        if (isMajor) {
          ctx.moveTo(x + dotRadius * 2, y);
          ctx.arc(x, y, dotRadius * 2, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();

    // Grid Major Lines
    ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1 / this.scale;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gs * majorEvery) {
      ctx.moveTo(x, startY); ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gs * majorEvery) {
      ctx.moveTo(startX, y); ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Center Crosshair Origin
    ctx.strokeStyle = theme === 'light' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1.5 / this.scale;
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
    ctx.moveTo(0, -12); ctx.lineTo(0, 12);
    ctx.stroke();
  }

  private drawClockTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, size = 6) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.stroke();
  }

  private drawInversionBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r = 3.5) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.stroke();
  }

  // ── Component Drawing ─────────────────────────────────────────────────────
  private drawComponent(ctx: CanvasRenderingContext2D, c: CircuitComponent, isSelected: boolean) {
    ctx.save();
    const { width, height } = c.bounds;
    const type = c.type;
    const rot = c.transform.rotation ?? 0;

    ctx.translate(c.transform.x + width / 2, c.transform.y + height / 2);
    if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);

    if (isSelected) {
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;

    // ── TEXT ──────────────────────────────────────────────────────────────
    if (type === 'TEXT') {
      const text = (c.properties['text'] as string) || c.label || 'Text';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, 0, 0);
      if (isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        const m = ctx.measureText(text);
        ctx.strokeRect(-2, -2, m.width + 4, 20);
        ctx.setLineDash([]);
      }
      ctx.restore();
      return;
    }

    // ── GATES ─────────────────────────────────────────────────────────────
    if (type === 'AND') {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(width * 0.5, 0);
      ctx.arc(width * 0.5, height * 0.5, height * 0.5, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(0, height); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (type === 'OR') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(width * 0.3, 0, width * 0.7, height * 0.15, width, height * 0.5);
      ctx.bezierCurveTo(width * 0.7, height * 0.85, width * 0.3, height, 0, height);
      ctx.bezierCurveTo(width * 0.2, height * 0.7, width * 0.2, height * 0.3, 0, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (type === 'XOR') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(width * 0.3, 0, width * 0.7, height * 0.15, width, height * 0.5);
      ctx.bezierCurveTo(width * 0.7, height * 0.85, width * 0.3, height, 0, height);
      ctx.bezierCurveTo(width * 0.2, height * 0.7, width * 0.2, height * 0.3, 0, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.bezierCurveTo(width * 0.15, height * 0.3, width * 0.15, height * 0.7, -6, height);
      ctx.stroke();
    } else if (type === 'NOT' || type === 'BUFFER') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(type === 'NOT' ? width - 10 : width - 4, height * 0.5);
      ctx.lineTo(0, height); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (type === 'NOT') {
        this.drawInversionBubble(ctx, width - 5, height * 0.5, 4);
      }
    } else if (type === 'NAND') {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(width * 0.5, 0);
      ctx.arc(width * 0.5, height * 0.5, height * 0.5, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(0, height); ctx.closePath();
      ctx.fill(); ctx.stroke();
      this.drawInversionBubble(ctx, width + 5, height * 0.5, 4);
    } else if (type === 'NOR') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(width * 0.3, 0, width * 0.7, height * 0.15, width, height * 0.5);
      ctx.bezierCurveTo(width * 0.7, height * 0.85, width * 0.3, height, 0, height);
      ctx.bezierCurveTo(width * 0.2, height * 0.7, width * 0.2, height * 0.3, 0, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      this.drawInversionBubble(ctx, width + 5, height * 0.5, 4);
    } else if (type === 'XNOR') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(width * 0.3, 0, width * 0.7, height * 0.15, width, height * 0.5);
      ctx.bezierCurveTo(width * 0.7, height * 0.85, width * 0.3, height, 0, height);
      ctx.bezierCurveTo(width * 0.2, height * 0.7, width * 0.2, height * 0.3, 0, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.bezierCurveTo(width * 0.15, height * 0.3, width * 0.15, height * 0.7, -6, height);
      ctx.stroke();
      this.drawInversionBubble(ctx, width + 5, height * 0.5, 4);
    } else if (type === 'TRI_STATE_BUFFER') {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(width - 4, height * 0.4); ctx.lineTo(0, height * 0.8);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(width * 0.5, height); ctx.lineTo(width * 0.5, height * 0.6); ctx.stroke();
    }
    
    // ── INPUTS & OUTPUTS ──────────────────────────────────────────────────
    else if (type === 'SWITCH') {
      const isOn = c.properties['isOn'] as boolean ?? false;
      ctx.fillStyle = isOn ? '#10b981' : '#334155';
      ctx.shadowColor = isOn ? '#10b981' : 'transparent';
      ctx.shadowBlur = isOn ? 8 : 0;
      ctx.beginPath();
      ctx.roundRect(0, height * 0.2, width, height * 0.6, height * 0.3);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(isOn ? width - height * 0.35 : height * 0.35, height * 0.5, height * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'PUSH_BUTTON') {
      const isPressed = c.properties['isPressed'] as boolean ?? false;
      ctx.fillStyle = isPressed ? '#3b82f6' : '#334155';
      ctx.beginPath(); ctx.roundRect(4, 4, width - 8, height - 8, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = isPressed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(width / 2, height / 2, 7, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'LED') {
      const inputPin = c.pins.find(p => p.direction === 'input');
      const sig = inputPin?.currentValue ?? SignalValue.UNKNOWN;
      const activeLow = (c.properties['activeLow'] as boolean) ?? false;
      const effectiveHigh = activeLow ? (sig === SignalValue.LOW) : (sig === SignalValue.HIGH);
      const isFloating = sig === SignalValue.FLOATING;
      const isErr = sig === SignalValue.ERROR;
      const isLow = activeLow ? (sig === SignalValue.HIGH) : (sig === SignalValue.LOW);

      const colorName = (c.properties['color'] as string) || 'red';
      const ledColorMap: Record<string, { primary: string; glow: string; dark: string }> = {
        red:    { primary: '#ef4444', glow: 'rgba(239,68,68,0.7)', dark: '#7f1d1d' },
        green:  { primary: '#10b981', glow: 'rgba(16,185,129,0.7)', dark: '#064e3b' },
        blue:   { primary: '#3b82f6', glow: 'rgba(59,130,246,0.7)', dark: '#1e3a8a' },
        yellow: { primary: '#f59e0b', glow: 'rgba(245,158,11,0.7)', dark: '#78350f' },
        cyan:   { primary: '#06b6d4', glow: 'rgba(6,182,212,0.7)', dark: '#164e63' },
        purple: { primary: '#8b5cf6', glow: 'rgba(139,92,246,0.7)', dark: '#4c1d95' },
        white:  { primary: '#f8fafc', glow: 'rgba(248,250,252,0.7)', dark: '#334155' },
      };
      const themeColors = ledColorMap[colorName] ?? ledColorMap.red;

      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) / 2 - 4;

      // Outer bezel ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (effectiveHigh) {
        // High: vivid illuminated glow + radial gradient + specular highlight
        ctx.shadowColor = themeColors.primary;
        ctx.shadowBlur = 24;
        const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, themeColors.primary);
        grad.addColorStop(1, themeColors.dark);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Specular highlight arc
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isLow) {
        // Low: dark unlit LED lens
        const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
        grad.addColorStop(0, '#334155');
        grad.addColorStop(0.7, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (isFloating) {
        // Floating / High-Z: amber tint
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#78350f');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Z', cx, cy);
      } else if (isErr) {
        // Error: intense magenta/rose warning state
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', cx, cy);
      } else {
        // Unknown: muted dark gray lens
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy);
      }
    } else if (type === 'RGB_LED') {
      const rPin = c.pins.find(p => p.name === 'R');
      const gPin = c.pins.find(p => p.name === 'G');
      const bPin = c.pins.find(p => p.name === 'B');
      const rVal = rPin?.currentValue === SignalValue.HIGH;
      const gVal = gPin?.currentValue === SignalValue.HIGH;
      const bVal = bPin?.currentValue === SignalValue.HIGH;

      const cx = width / 2 + 5;
      const cy = height / 2;
      const r = Math.min(width, height) / 2 - 4;

      const anyOn = rVal || gVal || bVal;
      const red = rVal ? 255 : 25;
      const green = gVal ? 255 : 25;
      const blue = bVal ? 255 : 25;
      const rgbColor = `rgb(${red}, ${green}, ${blue})`;

      ctx.beginPath();
      ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
      ctx.stroke();

      if (anyOn) {
        ctx.shadowColor = rgbColor;
        ctx.shadowBlur = 22;
        const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, rgbColor);
        grad.addColorStop(1, `rgb(${Math.floor(red * 0.6)}, ${Math.floor(green * 0.6)}, ${Math.floor(blue * 0.6)})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'SEVEN_SEGMENT') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      const segValues = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(name => {
        const pin = c.pins.find(p => p.name === name);
        return pin?.currentValue === SignalValue.HIGH;
      });
      const segLines = [
        [15, 14, 35, 14], // a
        [35, 14, 35, 38], // b
        [35, 42, 35, 66], // c
        [15, 66, 35, 66], // d
        [15, 42, 15, 66], // e
        [15, 14, 15, 38], // f
        [15, 40, 35, 40], // g
      ];
      segLines.forEach(([x1, y1, x2, y2], i) => {
        const on = segValues[i];
        if (on) {
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3.5;
        } else {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(239,68,68,0.12)';
          ctx.lineWidth = 3;
        }
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.shadowBlur = 0;
    } else if (type === 'HEX_DISPLAY') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      let val = 0;
      let hasAnySignal = false;
      for (let i = 0; i < 4; i++) {
        const pin = c.pins.find(p => p.name === `D${i}`) ?? c.pins[i];
        if (pin && pin.currentValue === SignalValue.HIGH) {
          val |= (1 << i);
          hasAnySignal = true;
        } else if (pin && pin.currentValue === SignalValue.LOW) {
          hasAnySignal = true;
        }
      }
      // Inner bezel screen
      ctx.fillStyle = '#050811';
      ctx.beginPath();
      ctx.roundRect(8, 8, width - 16, height - 16, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16,185,129,0.2)';
      ctx.stroke();

      ctx.fillStyle = hasAnySignal ? '#10b981' : '#334155';
      if (hasAnySignal) {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
      }
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(val.toString(16).toUpperCase(), width / 2, height / 2);
      ctx.shadowBlur = 0;
    } else if (type === 'LCD') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.roundRect(6, 6, width - 12, height - 12, 4);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LCD DISPLAY', width / 2, height / 2);
    } else if (type === 'CLOCK') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5;
      const cy = height / 2;
      ctx.beginPath();
      ctx.moveTo(6, cy); ctx.lineTo(12, cy); ctx.lineTo(12, cy - 8);
      ctx.lineTo(20, cy - 8); ctx.lineTo(20, cy); ctx.lineTo(26, cy);
      ctx.lineTo(26, cy - 8); ctx.lineTo(34, cy - 8); ctx.lineTo(34, cy); ctx.lineTo(40, cy);
      ctx.stroke();
    } else if (type === 'CONSTANT' || type === 'CONSTANT_0' || type === 'CONSTANT_1') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 5); ctx.fill(); ctx.stroke();
      const cVal = type === 'CONSTANT_1' ? 1 : type === 'CONSTANT_0' ? 0 : (c.properties['value'] === 1 ? 1 : 0);
      ctx.fillStyle = cVal === 1 ? '#10b981' : '#60a5fa';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(cVal), width / 2, height / 2);
    } else if (type === 'RESULT_CONSTANT') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 5); ctx.fill(); ctx.stroke();
      const rcBitW = Math.max(1, Math.min(64, (c.properties['bitWidth'] as number) ?? 4));
      let rcValBig = BigInt(0);
      try {
        const rcRaw = c.properties['value'];
        if (typeof rcRaw === 'bigint') rcValBig = rcRaw;
        else if (typeof rcRaw === 'number') rcValBig = BigInt(Math.trunc(rcRaw));
        else if (typeof rcRaw === 'string') {
          const rcT = (rcRaw as string).trim();
          if (rcT.startsWith('0x') || rcT.startsWith('0X') || rcT.startsWith('0b') || rcT.startsWith('0B')) rcValBig = BigInt(rcT);
          else rcValBig = BigInt(rcT || '0');
        }
      } catch { rcValBig = BigInt(0); }
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GEN', width / 2, 10);
      const rcHexChars = Math.ceil(rcBitW / 4);
      const rcHexStr = rcValBig.toString(16).toUpperCase().padStart(rcHexChars, '0');
      let rcDisplayTxt = rcBitW <= 4 ? rcValBig.toString(10) : `0x${rcHexStr}`;
      if (rcDisplayTxt.length > 10) rcDisplayTxt = `0x${rcHexStr.slice(-8)}`;
      ctx.font = rcBitW > 32 ? 'bold 9px monospace' : rcBitW > 16 ? 'bold 10px monospace' : 'bold 12px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(rcDisplayTxt, width / 2, height / 2 + 2);
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(56,189,248,0.7)';
      ctx.fillText(`[${rcBitW}b]`, width / 2, height - 8);
    } else if (type === 'INPUT_PIN') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 5); ctx.fill(); ctx.stroke();
      const pinBitW = (c.properties['bitWidth'] as number) ?? 1;
      const pinRadix = (c.properties['radix'] as string) ?? 'bin';
      const pinVal = typeof c.properties['value'] === 'number' ? c.properties['value'] : (c.properties['value'] === true ? 1 : 0);
      const isHigh = pinVal !== 0;

      // Inner screen bezel
      ctx.fillStyle = '#050811';
      ctx.beginPath(); ctx.roundRect(4, 4, width - 8, height - 8, 3); ctx.fill();
      ctx.strokeStyle = isHigh ? '#10b981' : '#334155';
      ctx.stroke();

      // Display value
      ctx.fillStyle = isHigh ? '#10b981' : '#60a5fa';
      if (isHigh) { ctx.shadowColor = '#10b981'; ctx.shadowBlur = 8; }
      ctx.font = pinBitW === 1 ? 'bold 18px monospace' : (pinBitW > 16 ? 'bold 9px monospace' : 'bold 11px monospace');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      let displayStr = '0';
      if (pinBitW === 1) {
        displayStr = pinVal === 1 ? '1' : '0';
      } else {
        const mask = pinBitW >= 32 ? 0xFFFFFFFF : (1 << pinBitW) - 1;
        const uVal = (pinVal & mask) >>> 0;
        if (pinRadix === 'hex') displayStr = `0x${uVal.toString(16).toUpperCase()}`;
        else if (pinRadix === 'dec') displayStr = `${uVal}`;
        else if (pinRadix === 'signed') {
          const isNeg = pinBitW < 32 && (pinVal & (1 << (pinBitW - 1))) !== 0;
          displayStr = isNeg ? String(uVal - (1 << pinBitW)) : String(uVal);
        } else {
          displayStr = uVal.toString(2).padStart(pinBitW, '0');
          if (displayStr.length > 6) displayStr = `…${displayStr.slice(-5)}`;
        }
      }
      ctx.fillText(displayStr, width / 2, height / 2 - (pinBitW > 1 ? 2 : 0));
      ctx.shadowBlur = 0;

      // Label & bitwidth badge
      const pinLbl = (c.properties['label'] as string) || c.label || '';
      if (pinLbl) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 8px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(pinLbl.length > 6 ? pinLbl.slice(0, 5) + '…' : pinLbl, width / 2, height - 6);
      }
    } else if (type === 'OUTPUT_PIN') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 5); ctx.fill(); ctx.stroke();
      const inPin = c.pins.find(p => p.direction === 'input');
      const sig = inPin?.currentValue ?? SignalValue.UNKNOWN;
      const pinBitW = (c.properties['bitWidth'] as number) ?? 1;
      const pinRadix = (c.properties['radix'] as string) ?? 'bin';
      const activeLow = (c.properties['activeLow'] as boolean) ?? false;

      // Inner screen bezel
      ctx.fillStyle = '#050811';
      ctx.beginPath(); ctx.roundRect(4, 4, width - 8, height - 8, 3); ctx.fill();
      ctx.strokeStyle = sig === SignalValue.HIGH ? '#38bdf8' : (sig === SignalValue.ERROR ? '#ef4444' : '#334155');
      ctx.stroke();

      const outColor = SIGNAL_HEX[sig] ?? '#6b7280';
      ctx.fillStyle = outColor;
      if (sig === SignalValue.HIGH) { ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 8; }
      else if (sig === SignalValue.ERROR) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8; }

      ctx.font = pinBitW === 1 ? 'bold 18px monospace' : (pinBitW > 16 ? 'bold 9px monospace' : 'bold 11px monospace');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      let displayStr = '?';
      if (sig === SignalValue.HIGH) {
        displayStr = activeLow ? '0' : '1';
        if (pinBitW > 1 && pinRadix === 'hex') displayStr = '0x1';
      } else if (sig === SignalValue.LOW) {
        displayStr = activeLow ? '1' : '0';
        if (pinBitW > 1 && pinRadix === 'hex') displayStr = '0x0';
      } else if (sig === SignalValue.FLOATING) {
        displayStr = 'Z';
      } else if (sig === SignalValue.ERROR) {
        displayStr = '!';
      } else {
        displayStr = 'X';
      }

      ctx.fillText(displayStr, width / 2, height / 2 - (pinBitW > 1 ? 2 : 0));
      ctx.shadowBlur = 0;

      const pinLbl = (c.properties['label'] as string) || c.label || (activeLow ? 'OUT̅' : '');
      if (pinLbl) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 8px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(pinLbl.length > 6 ? pinLbl.slice(0, 5) + '…' : pinLbl, width / 2, height - 6);
      }
    } else if (type === 'PROBE') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 5); ctx.fill(); ctx.stroke();
      const probePin = c.pins[0];
      const probeVal = probePin?.currentValue ?? SignalValue.UNKNOWN;
      const probeBitW = (c.properties['bitWidth'] as number) ?? 1;
      const probeRadix = (c.properties['radix'] as string) ?? 'bin';
      ctx.fillStyle = '#050811';
      ctx.beginPath(); ctx.roundRect(4, 4, width - 8, height - 8, 3); ctx.fill();
      ctx.strokeStyle = probeVal === SignalValue.HIGH ? '#10b981' : '#334155';
      ctx.stroke();
      const probeColor = SIGNAL_HEX[probeVal] ?? '#6b7280';
      ctx.fillStyle = probeColor;
      if (probeVal === SignalValue.HIGH) { ctx.shadowColor = '#10b981'; ctx.shadowBlur = 8; }
      ctx.font = probeBitW > 16 ? 'bold 9px monospace' : 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let probeDisplayStr = probeVal === SignalValue.HIGH ? '1' : probeVal === SignalValue.LOW ? '0' : probeVal === SignalValue.FLOATING ? 'Z' : probeVal === SignalValue.ERROR ? 'E' : '?';
      if (probeBitW > 1) {
        const pinV = probeVal === SignalValue.HIGH ? 1 : 0;
        if (probeRadix === 'hex') probeDisplayStr = `0x${pinV.toString(16).toUpperCase()}`;
        else if (probeRadix === 'dec') probeDisplayStr = `${pinV}`;
        else probeDisplayStr = `${pinV}`.padStart(probeBitW, '0');
      }
      ctx.fillText(probeDisplayStr, width / 2, height / 2);
      ctx.shadowBlur = 0;
    } else if (type === 'HALF_ADDER' || type === 'FULL_ADDER') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(type === 'HALF_ADDER' ? 'HA' : 'FA', width / 2, height / 2);
      ctx.fillStyle = 'rgba(56,189,248,0.3)';
      ctx.font = '9px monospace';
      ctx.fillText('+', width / 2, height / 2 + 14);
    } else if (type === 'ADDER' || type === 'SUBTRACTOR' || type === 'ADDER_SUBTRACTOR') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      const adderSym = type === 'ADDER' ? '+' : type === 'SUBTRACTOR' ? '−' : '±';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(adderSym, width / 2, height / 2 - 6);
      ctx.font = 'bold 9px monospace';
      const adderBitW = (c.properties['bitWidth'] as number) ?? 4;
      ctx.fillText(`${adderBitW}-BIT`, width / 2, height / 2 + 14);
    } else if (type === 'MULTIPLIER' || type === 'DIVIDER') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      const symbol = type === 'MULTIPLIER' ? '×' : '÷';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(symbol, width / 2, height / 2 - 6);
      ctx.font = 'bold 9px monospace';
      const bitW = (c.properties['bitWidth'] as number) ?? 4;
      ctx.fillText(`${bitW}-BIT`, width / 2, height / 2 + 14);
    } else if (type === 'INCREMENTER' || type === 'DECREMENTER' || type === 'NEGATOR') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      const symbol = type === 'INCREMENTER' ? '+1' : type === 'DECREMENTER' ? '−1' : '−A';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(symbol, width / 2, height / 2 - 4);
      ctx.font = 'bold 9px monospace';
      const bitW = (c.properties['bitWidth'] as number) ?? 4;
      ctx.fillText(`[${bitW}b]`, width / 2, height / 2 + 14);
    } else if (type === 'COMPARATOR') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('COMP', width / 2 - 6, height / 2);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText('>', width - 8, 15);
      ctx.fillText('=', width - 8, 30);
      ctx.fillText('<', width - 8, 45);
    } else if (type === 'ALU') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.7, 0);
      ctx.lineTo(width, height * 0.2);
      ctx.lineTo(width, height * 0.8);
      ctx.lineTo(width * 0.7, height);
      ctx.lineTo(0, height);
      ctx.lineTo(width * 0.35, height * 0.5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ALU', width * 0.6, height / 2);
    }

    // ── PLEXERS ───────────────────────────────────────────────────────────
    else if (type === 'MULTIPLEXER' || type === 'ENCODER' || type === 'PRIORITY_ENCODER') {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height * 0.2);
      ctx.lineTo(width, height * 0.8);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lbl = type === 'MULTIPLEXER' ? 'MUX' : type === 'PRIORITY_ENCODER' ? 'P-ENC' : 'ENC';
      ctx.fillText(lbl, width / 2, height / 2);
    } else if (type === 'DEMULTIPLEXER' || type === 'DECODER') {
      ctx.beginPath();
      ctx.moveTo(0, height * 0.2);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height * 0.8);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(type === 'DEMULTIPLEXER' ? 'DEMUX' : 'DEC', width / 2, height / 2);
    }

    // ── SEQUENTIAL & MEMORY ───────────────────────────────────────────────
    else if (['SR_LATCH', 'D_LATCH', 'D_FLIPFLOP', 'JK_FLIPFLOP', 'T_FLIPFLOP'].includes(type)) {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      
      const clkPin = c.pins.find(p => p.name === 'CLK');
      if (clkPin) this.drawClockTriangle(ctx, clkPin.position.x, clkPin.position.y);

      const qBarPin = c.pins.find(p => p.name === 'Q̅');
      if (qBarPin) this.drawInversionBubble(ctx, qBarPin.position.x + 3.5, qBarPin.position.y, 3.5);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = type === 'D_FLIPFLOP' ? 'D-FF' : type === 'JK_FLIPFLOP' ? 'JK-FF' : type === 'T_FLIPFLOP' ? 'T-FF' : type === 'SR_LATCH' ? 'SR' : 'D-LAT';
      ctx.fillText(label, width / 2, height / 2);
    } else if (type === 'REGISTER' || type === 'COUNTER' || type === 'SHIFT_REGISTER') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      const clkPin = c.pins.find(p => p.name === 'CLK');
      if (clkPin) this.drawClockTriangle(ctx, clkPin.position.x, clkPin.position.y);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const bitW = (c.properties['bitWidth'] as number) ?? 4;
      const tag = type === 'REGISTER' ? 'REG' : type === 'SHIFT_REGISTER' ? 'SHIFT' : 'CTR';
      ctx.fillText(tag, width / 2, height / 2 - 8);
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`[${bitW}-BIT]`, width / 2, height / 2 + 8);
    } else if (type === 'REGISTER_FILE') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      const clkPin = c.pins.find(p => p.name === 'CLK');
      if (clkPin) this.drawClockTriangle(ctx, clkPin.position.x, clkPin.position.y);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('REG FILE', width / 2, 25);
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('4 x N-bit', width / 2, 40);
    } else if (type === 'RAM' || type === 'ROM') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      
      ctx.strokeStyle = 'rgba(56,189,248,0.2)';
      ctx.lineWidth = 1;
      const gridX = width / 2 - 12;
      const gridY = height / 2 - 8;
      for (let i = 0; i <= 24; i += 8) {
        ctx.beginPath(); ctx.moveTo(gridX + i, gridY); ctx.lineTo(gridX + i, gridY + 20); ctx.stroke();
      }
      for (let j = 0; j <= 20; j += 5) {
        ctx.beginPath(); ctx.moveTo(gridX, gridY + j); ctx.lineTo(gridX + 24, gridY + j); ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(type, width / 2, height / 2 - 14);
    } else if (type === 'SPLITTER' || type === 'MERGER') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      const bitW = (c.properties['bitWidth'] as number) ?? 4;
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(type === 'SPLITTER' ? 'SPL' : 'MRG', width / 2, height / 2 - 6);
      ctx.font = '8px monospace';
      ctx.fillText(`1:${bitW}`, width / 2, height / 2 + 6);
    } else if (type === 'BIT_SELECTOR') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 4); ctx.fill(); ctx.stroke();
      const bitIndex = (c.properties['bitIndex'] as number) ?? 0;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`[${bitIndex}]`, width / 2, height / 2);
    } else if (type === 'SUBCIRCUIT') {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 6); ctx.fill(); ctx.stroke();
      // IC notch at top
      ctx.beginPath();
      ctx.arc(width / 2, 0, 5, 0, Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lbl = (c.properties['name'] as string) || c.label || 'Subcircuit';
      ctx.fillText(lbl.length > 8 ? lbl.slice(0, 7) + '…' : lbl, width / 2, height / 2);
    } else {
      ctx.beginPath(); ctx.roundRect(0, 0, width, height, 5); ctx.fill(); ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // ── Pins & Labels ───────────────────────────────────────────────────────
    c.pins.forEach(p => {
      const px = p.position.x;
      const py = p.position.y;
      const color = SIGNAL_HEX[p.currentValue] ?? '#6b7280';

      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (this.scale > 0.75 && p.name && type !== 'HEX_DISPLAY' && type !== 'SEVEN_SEGMENT') {
        ctx.fillStyle = 'rgba(203,213,225,0.85)';
        ctx.font = '8px ui-sans-serif, system-ui, sans-serif';
        ctx.textBaseline = 'middle';

        if (p.direction === 'input') {
          if (py >= height - 2) {
            ctx.textAlign = 'center';
            ctx.fillText(p.name, px, py - 8);
          } else if (py <= 2) {
            ctx.textAlign = 'center';
            ctx.fillText(p.name, px, py + 8);
          } else {
            ctx.textAlign = 'left';
            ctx.fillText(p.name, px + 5, py);
          }
        } else {
          ctx.textAlign = 'right';
          ctx.fillText(p.name, px - 5, py);
        }
      }
    });

    ctx.restore();
  }

  // ── Wire Drawing & Junctions ──────────────────────────────────────────────
  private drawWire(ctx: CanvasRenderingContext2D, w: Wire, components: CircuitComponent[], isSelected: boolean) {
    let fromPos: Point2D | null = null;
    let toPos: Point2D | null = null;

    for (const comp of components) {
      const pFrom = comp.pins.find(p => p.id === w.fromPinId);
      if (pFrom) fromPos = getPinWorldPosition(comp, pFrom);
      const pTo = comp.pins.find(p => p.id === w.toPinId);
      if (pTo) toPos = getPinWorldPosition(comp, pTo);
    }

    if (!fromPos || !toPos) return;

    const color = isSelected ? '#38bdf8' : SIGNAL_HEX[w.currentValue] ?? '#6b7280';
    const isBus = w.bitWidth > 1 || w.isBus;
    const lineWidth = isSelected ? (isBus ? 4.5 : 3.5) : (isBus ? 3.5 : 2);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const gs = useAppStore.getState().viewport.gridSize;
    const isDragAffected = this.drag && (
      components.some(c => this.drag!.origins.has(c.id) && (c.pins.some(p => p.id === w.fromPinId) || c.pins.some(p => p.id === w.toPinId)))
    );

    // Active waypoint drag override
    const waypoints = (this.waypointDrag && this.waypointDrag.wireId === w.id)
      ? (w.waypoints ?? []).map((wp, idx) => idx === this.waypointDrag!.waypointIndex ? this.waypointDrag!.currentPos : wp)
      : (w.waypoints ?? []);

    const segments = (!isDragAffected && w.segments.length > 0 && waypoints.length === 0)
      ? w.segments
      : routeWire(fromPos, toPos, w.routingMode ?? 'orthogonal', gs, waypoints);

    // Draw selection halo
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56,189,248,0.3)';
      ctx.lineWidth = lineWidth + 6;
      ctx.beginPath();
      ctx.moveTo(segments[0]?.from.x ?? fromPos.x, segments[0]?.from.y ?? fromPos.y);
      segments.forEach(seg => ctx.lineTo(seg.to.x, seg.to.y));
      ctx.stroke();
      ctx.restore();
    }

    // Draw main wire path
    ctx.beginPath();
    ctx.moveTo(segments[0]?.from.x ?? fromPos.x, segments[0]?.from.y ?? fromPos.y);
    segments.forEach(seg => ctx.lineTo(seg.to.x, seg.to.y));
    ctx.stroke();

    // Draw junctions
    if (w.junctions && w.junctions.length > 0) {
      ctx.fillStyle = color;
      w.junctions.forEach(j => {
        ctx.beginPath();
        ctx.arc(j.x, j.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw bus indicator
    if (isBus && segments.length > 0) {
      // Find longest segment to put slash
      let longest = segments[0];
      let maxLen = 0;
      for (const seg of segments) {
        const len = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);
        if (len > maxLen) {
          maxLen = len;
          longest = seg;
        }
      }
      if (maxLen > 25) {
        const midX = (longest.from.x + longest.to.x) / 2;
        const midY = (longest.from.y + longest.to.y) / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(midX - 3, midY + 4);
        ctx.lineTo(midX + 3, midY - 4);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`/${w.bitWidth}`, midX, midY - 6);
      }
    }

    // Draw editable waypoint handles for selected wire
    if (isSelected && w.waypoints && w.waypoints.length > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      w.waypoints.forEach(wp => {
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  // ── Live Wire Preview ─────────────────────────────────────────────────────
  private drawWirePreview(ctx: CanvasRenderingContext2D, gs: number) {
    if (!this.wireStartPos) return;

    const targetPos = this.hoveredPin ? this.hoveredPin.pos : snapPointToGrid(this.currentPointerWorld, gs);
    const waypoints = this.wireWaypoints;
    const segments = buildPathThroughWaypoints(this.wireStartPos, targetPos, waypoints, 'orthogonal', gs);

    ctx.strokeStyle = this.hoveredPin ? (this.hoveredPin.isValid ? '#10b981' : '#ef4444') : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);

    ctx.beginPath();
    ctx.moveTo(segments[0]?.from.x ?? this.wireStartPos.x, segments[0]?.from.y ?? this.wireStartPos.y);
    segments.forEach(seg => ctx.lineTo(seg.to.x, seg.to.y));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw waypoint nodes
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(this.wireStartPos.x, this.wireStartPos.y, 5, 0, Math.PI * 2);
    ctx.fill();

    waypoints.forEach(wp => {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── Event Listeners ───────────────────────────────────────────────────────
  private setupListeners() {
    const canvas = this.canvas;
    if (!canvas) return;

    // Zoom
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.9;
      const newScale = Math.max(0.1, Math.min(10, this.scale * zoomFactor));
      const { x: mx, y: my } = this.getCanvasRelative(e);
      const panX = mx - (mx - this.panX) * (newScale / this.scale);
      const panY = my - (my - this.panY) * (newScale / this.scale);
      useAppStore.getState().setViewport({
        transform: { ...useAppStore.getState().viewport.transform, x: panX, y: panY, scale: newScale },
      });
    }, { passive: false });

    // Drag and drop from palette
    canvas.addEventListener('dragover', e => e.preventDefault());
    canvas.addEventListener('drop', e => {
      e.preventDefault();
      const type = e.dataTransfer?.getData('component-type');
      if (!type) return;
      const { x: sx, y: sy } = this.getCanvasRelative(e as unknown as PointerEvent);
      const pos = this.screenToWorld(sx, sy);
      const component = createComponent(type, pos.x, pos.y);
      const store = useAppStore.getState();
      store.addComponent(component);
      store.selectComponent(component.id);
      store.setTool('select');
    });

    // ── POINTER DOWN ────────────────────────────────────────────────────────
    canvas.addEventListener('pointerdown', e => {
      const { x: sx, y: sy } = this.getCanvasRelative(e);
      const worldPos = this.screenToWorld(sx, sy);
      this.currentPointerWorld = worldPos;
      const store = useAppStore.getState();
      const circuit = store.project?.circuits.find(c => c.id === store.currentCircuitId);
      const components = circuit?.components ?? [];
      const wires = circuit?.wires ?? [];

      // Middle click or Pan tool
      if (e.button === 1 || (e.button === 0 && store.editor.currentTool === 'pan')) {
        this.isPanning = true;
        this.lastPanScreen = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      if (e.button !== 0) return;

      // ── WAYPOINT DRAG (If clicking on selected wire waypoint handle) ──────
      if (store.editor.currentTool === 'select') {
        for (const wireId of store.selection.selectedWireIds) {
          const wire = wires.find(w => w.id === wireId);
          if (wire && wire.waypoints) {
            for (let i = 0; i < wire.waypoints.length; i++) {
              const wp = wire.waypoints[i];
              if (Math.hypot(worldPos.x - wp.x, worldPos.y - wp.y) <= 8) {
                this.waypointDrag = {
                  wireId: wire.id,
                  waypointIndex: i,
                  originalPos: { ...wp },
                  currentPos: { ...wp },
                };
                canvas.setPointerCapture(e.pointerId);
                return;
              }
            }
          }
        }
      }

      // ── WIRE TOOL / DRAWING BENDS ─────────────────────────────────────────
      if (store.editor.currentTool === 'wire') {
        // Check if clicked a pin
        for (const c of components) {
          for (const p of c.pins) {
            const pinWorldPos = getPinWorldPosition(c, p);
            if (Math.hypot(worldPos.x - pinWorldPos.x, worldPos.y - pinWorldPos.y) <= 12) {
              if (this.wireStartPinId) {
                // Clicking destination pin finishes wire
                if (p.id === this.wireStartPinId) return;
                const forward = isValidWireConnection(components, this.wireStartPinId, p.id);
                const backward = !forward && isValidWireConnection(components, p.id, this.wireStartPinId);
                if (!forward && !backward) return;

                const fromId = forward ? this.wireStartPinId : p.id;
                const toId = forward ? p.id : this.wireStartPinId;
                const fromPin = components.flatMap(comp => comp.pins).find(pin => pin.id === fromId);
                const bitWidth = fromPin?.bitWidth ?? 1;

                const mode: RoutingMode = e.shiftKey ? 'diagonal' : 'orthogonal';
                const segments = buildPathThroughWaypoints(
                  this.wireStartPos!,
                  pinWorldPos,
                  this.wireWaypoints,
                  mode,
                  store.viewport.gridSize,
                );

                const newWire: Wire = {
                  id: nanoid(),
                  segments,
                  fromPinId: fromId,
                  toPinId: toId,
                  bitWidth,
                  isBus: bitWidth > 1,
                  currentValue: SignalValue.UNKNOWN,
                  junctions: [],
                  waypoints: [...this.wireWaypoints],
                  routingMode: mode,
                };

                store.addWire(newWire);
                this.wireStartPinId = null;
                this.wireStartPos = null;
                this.wireWaypoints = [];
                this.hoveredPin = null;
              } else {
                // Start new wire from this pin
                this.wireStartPinId = p.id;
                this.wireStartPos = pinWorldPos;
                this.wireWaypoints = [];
              }
              return;
            }
          }
        }

        // If wire already started, clicking empty space creates an intermediate waypoint bend!
        if (this.wireStartPos) {
          const snappedWp = snapPointToGrid(worldPos, store.viewport.gridSize);
          this.wireWaypoints.push(snappedWp);
          return;
        }
        return;
      }

      // ── PLACE COMPONENT TOOL ──────────────────────────────────────────────
      if (store.editor.currentTool === 'component' && store.editor.currentComponentType) {
        const gs = store.viewport.gridSize;
        const newComp = createComponent(
          store.editor.currentComponentType,
          Math.round(worldPos.x / gs) * gs,
          Math.round(worldPos.y / gs) * gs,
        );
        store.addComponent(newComp);
        store.selectComponent(newComp.id);
        store.setTool('select');
        return;
      }

      // ── HIT TEST COMPONENTS ───────────────────────────────────────────────
      for (const c of components) {
        const bounds = getComponentWorldBounds(c);
        if (
          worldPos.x >= bounds.x && worldPos.x <= bounds.x + bounds.width &&
          worldPos.y >= bounds.y && worldPos.y <= bounds.y + bounds.height
        ) {
          if (store.editor.currentTool === 'delete') { store.removeComponent(c.id); return; }
          if (store.editor.currentTool === 'probe') { store.addProbe(c.pins[0]?.id ?? '', c.label ?? c.type); return; }

          if (c.type === 'SWITCH' && store.editor.currentTool === 'select') {
            const isOn = !c.properties['isOn'];
            store.updateComponentProperty(c.id, 'isOn', isOn);
            void simulationService.forcePinValue(
              c.pins.find(pin => pin.direction === 'output')?.id ?? '',
              isOn ? SignalValue.HIGH : SignalValue.LOW,
            );
          } else if (c.type === 'PUSH_BUTTON' && store.editor.currentTool === 'select') {
            this.pressedButtonComponentId = c.id;
            store.updateComponentProperty(c.id, 'isPressed', true);
            void simulationService.forcePinValue(
              c.pins.find(pin => pin.direction === 'output')?.id ?? '',
              SignalValue.HIGH,
            );
          } else if (c.type === 'INPUT_PIN' && store.editor.currentTool === 'select') {
            const bitW = (c.properties['bitWidth'] as number) ?? 1;
            const curVal = typeof c.properties['value'] === 'number' ? c.properties['value'] : (c.properties['value'] === true ? 1 : 0);
            const mask = bitW >= 32 ? 0xFFFFFFFF : (1 << bitW) - 1;
            const nextVal = bitW === 1 ? (curVal === 1 ? 0 : 1) : ((curVal + 1) & mask);
            store.updateComponentProperty(c.id, 'value', nextVal);
            const outPin = c.pins.find(pin => pin.direction === 'output');
            if (outPin) {
              void simulationService.forcePinValue(outPin.id, nextVal === 1 ? SignalValue.HIGH : (nextVal === 0 ? SignalValue.LOW : nextVal as unknown as SignalValue));
            }
          } else if (c.type === 'CONSTANT' && store.editor.currentTool === 'select') {
            const curVal = c.properties['value'] === 1 || c.properties['value'] === true ? 1 : 0;
            const nextVal = curVal === 1 ? 0 : 1;
            store.updateComponentProperty(c.id, 'value', nextVal);
            const outPin = c.pins.find(pin => pin.direction === 'output');
            if (outPin) {
              void simulationService.forcePinValue(outPin.id, nextVal === 1 ? SignalValue.HIGH : SignalValue.LOW);
            }
          }

          store.selectComponent(c.id, e.shiftKey);

          if (store.editor.currentTool === 'select') {
            canvas.setPointerCapture(e.pointerId);
            const selectedIds = useAppStore.getState().selection.selectedEntityIds;
            const dragIds = selectedIds.has(c.id) ? selectedIds : new Set([c.id]);

            const origins = new Map<string, { x: number; y: number }>();
            for (const comp of components) {
              if (dragIds.has(comp.id)) {
                origins.set(comp.id, { x: comp.transform.x, y: comp.transform.y });
              }
            }

            this.drag = {
              origins,
              pointerStart: worldPos,
              grabOffset: { x: worldPos.x - c.transform.x, y: worldPos.y - c.transform.y },
              dx: 0,
              dy: 0,
            };
          }
          return;
        }
      }

      // ── HIT TEST WIRES ────────────────────────────────────────────────────
      for (const w of wires) {
        if (isPointNearWire(worldPos, w, 8)) {
          if (store.editor.currentTool === 'delete') {
            store.removeWire(w.id);
            return;
          }
          store.selectWire(w.id, e.shiftKey);
          return;
        }
      }

      // ── EMPTY CANVAS CLICK: BOX SELECT ────────────────────────────────────
      if (store.editor.currentTool === 'select') {
        this.isBoxSelecting = true;
        this.boxSelectStart = worldPos;
        if (!e.shiftKey) store.clearSelection();
        store.setSelectionBox({ x: worldPos.x, y: worldPos.y, width: 0, height: 0 });
        canvas.setPointerCapture(e.pointerId);
      }
    });

    // ── POINTER MOVE ────────────────────────────────────────────────────────
    canvas.addEventListener('pointermove', e => {
      const { x: sx, y: sy } = this.getCanvasRelative(e);
      this.currentPointerWorld = this.screenToWorld(sx, sy);
      const store = useAppStore.getState();

      if (this.isPanning) {
        const dx = e.clientX - this.lastPanScreen.x;
        const dy = e.clientY - this.lastPanScreen.y;
        const vp = store.viewport;
        store.setViewport({
          transform: { ...vp.transform, x: this.panX + dx, y: this.panY + dy },
        });
        this.lastPanScreen = { x: e.clientX, y: e.clientY };
        return;
      }

      // Active component drag
      if (this.drag) {
        this.drag.dx = this.currentPointerWorld.x - this.drag.pointerStart.x;
        this.drag.dy = this.currentPointerWorld.y - this.drag.pointerStart.y;
        return;
      }

      // Active waypoint drag
      if (this.waypointDrag) {
        const gs = store.viewport.gridSize;
        this.waypointDrag.currentPos = snapPointToGrid(this.currentPointerWorld, gs);
        return;
      }

      // Wire Tool Pin Snapping & Hover Validation
      if (store.editor.currentTool === 'wire') {
        const circuit = store.project?.circuits.find(c => c.id === store.currentCircuitId);
        const components = circuit?.components ?? [];
        let foundHover: { compId: string; pinId: string; pos: Point2D; isValid: boolean } | null = null;

        for (const c of components) {
          for (const p of c.pins) {
            const pinPos = getPinWorldPosition(c, p);
            if (Math.hypot(this.currentPointerWorld.x - pinPos.x, this.currentPointerWorld.y - pinPos.y) <= 12) {
              const isValid = this.wireStartPinId
                ? (isValidWireConnection(components, this.wireStartPinId, p.id) || isValidWireConnection(components, p.id, this.wireStartPinId))
                : true;
              foundHover = { compId: c.id, pinId: p.id, pos: pinPos, isValid };
              break;
            }
          }
          if (foundHover) break;
        }
        this.hoveredPin = foundHover;
      } else {
        this.hoveredPin = null;
      }

      // Box selection
      if (this.isBoxSelecting && this.boxSelectStart) {
        const box = {
          x: this.boxSelectStart.x,
          y: this.boxSelectStart.y,
          width: this.currentPointerWorld.x - this.boxSelectStart.x,
          height: this.currentPointerWorld.y - this.boxSelectStart.y,
        };
        store.setSelectionBox(box);
        store.selectInBox(box, e.shiftKey);
      }
    });

    // ── POINTER UP ──────────────────────────────────────────────────────────
    canvas.addEventListener('pointerup', e => {
      canvas.style.cursor = '';

      if (this.pressedButtonComponentId) {
        const id = this.pressedButtonComponentId;
        const store = useAppStore.getState();
        store.updateComponentProperty(id, 'isPressed', false);
        const comp = store.project?.circuits.find(c => c.id === store.currentCircuitId)?.components.find(c => c.id === id);
        if (comp) {
          void simulationService.forcePinValue(
            comp.pins.find(pin => pin.direction === 'output')?.id ?? '',
            SignalValue.LOW,
          );
        }
        this.pressedButtonComponentId = null;
      }

      // Commit component drag
      if (this.drag) {
        const store = useAppStore.getState();
        const gs = store.viewport.gridSize;
        const drag = this.drag;
        this.drag = null;

        if (drag.dx !== 0 || drag.dy !== 0) {
          store.commitDrag(drag.origins, drag.dx, drag.dy, gs);
        }
      }

      // Commit waypoint drag
      if (this.waypointDrag) {
        const store = useAppStore.getState();
        const { wireId, waypointIndex, currentPos } = this.waypointDrag;
        this.waypointDrag = null;

        const circuit = store.project?.circuits.find(c => c.id === store.currentCircuitId);
        const wire = circuit?.wires.find(w => w.id === wireId);
        if (wire && wire.waypoints) {
          const updatedWaypoints = [...wire.waypoints];
          updatedWaypoints[waypointIndex] = currentPos;
          store.updateWireWaypoints(wireId, updatedWaypoints);
        }
      }

      if (this.isBoxSelecting) {
        useAppStore.getState().setSelectionBox(null);
      }

      this.isPanning = false;
      this.isBoxSelecting = false;
      this.boxSelectStart = null;

      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    });

    canvas.addEventListener('pointercancel', () => {
      this.drag = null;
      this.waypointDrag = null;
      this.isPanning = false;
      this.isBoxSelecting = false;
      this.boxSelectStart = null;
      this.hoveredPin = null;
      canvas.style.cursor = '';
    });

    // Double click on wire to add waypoint bend
    canvas.addEventListener('dblclick', e => {
      const { x: sx, y: sy } = this.getCanvasRelative(e);
      const worldPos = this.screenToWorld(sx, sy);
      const store = useAppStore.getState();
      const circuit = store.project?.circuits.find(c => c.id === store.currentCircuitId);
      const wires = circuit?.wires ?? [];

      for (const w of wires) {
        if (isPointNearWire(worldPos, w, 8)) {
          const snappedWp = snapPointToGrid(worldPos, store.viewport.gridSize);
          const currentWps = w.waypoints ? [...w.waypoints] : [];
          
          // Insert waypoint in nearest segment position
          let insertIdx = currentWps.length;
          let bestDist = Infinity;
          for (let i = 0; i < w.segments.length; i++) {
            const dist = getDistanceToSegment(worldPos, w.segments[i]);
            if (dist < bestDist) {
              bestDist = dist;
              insertIdx = i;
            }
          }
          currentWps.splice(insertIdx, 0, snappedWp);
          store.updateWireWaypoints(w.id, currentWps);
          store.selectWire(w.id);
          return;
        }
      }
    });

    // Right-click or Esc cancels wire creation
    canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (this.wireStartPinId) {
        this.wireStartPinId = null;
        this.wireStartPos = null;
        this.wireWaypoints = [];
        this.hoveredPin = null;
      } else {
        this.emit('contextMenu', { x: e.clientX, y: e.clientY });
      }
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.wireStartPinId) {
        this.wireStartPinId = null;
        this.wireStartPos = null;
        this.wireWaypoints = [];
        this.hoveredPin = null;
      }
    });
  }

  destroy() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
    this.canvas = null;
    this.ctx = null;
  }
}
