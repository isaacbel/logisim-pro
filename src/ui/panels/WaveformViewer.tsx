import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@state/store';
import { SignalValue } from '@apptypes/core';
import { Download, Trash2 } from 'lucide-react';

const ROW_HEIGHT = 32;
const LABEL_WIDTH = 100;
const TICK_WIDTH = 12;

export function WaveformViewer() {
  const { probes, simulation, removeProbe } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--panel-bg') || '#111827';
    ctx.fillRect(0, 0, W, H);

    const contentW = W - LABEL_WIDTH;
    const maxTicks = Math.floor(contentW / TICK_WIDTH);

    probes.forEach((probe, rowIdx) => {
      const y = rowIdx * ROW_HEIGHT;
      const history = probe.history.slice(-maxTicks);

      // Row background
      ctx.fillStyle = rowIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0)';
      ctx.fillRect(0, y, W, ROW_HEIGHT);

      // Label
      ctx.fillStyle = probe.color;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(probe.label.slice(0, 10), 6, y + ROW_HEIGHT / 2);

      // Waveform
      const midY = y + ROW_HEIGHT / 2;
      const highY = y + 6;
      const lowY = y + ROW_HEIGHT - 6;

      ctx.strokeStyle = probe.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      let prevSig: SignalValue | null = null;
      history.forEach((sig, tickIdx) => {
        const x = LABEL_WIDTH + tickIdx * TICK_WIDTH;
        const sigY = sig === SignalValue.HIGH ? highY : sig === SignalValue.LOW ? lowY : midY;

        if (prevSig === null) {
          ctx.moveTo(x, sigY);
        } else {
          const prevY = prevSig === SignalValue.HIGH ? highY : prevSig === SignalValue.LOW ? lowY : midY;
          if (prevY !== sigY) {
            ctx.lineTo(x, prevY);
            ctx.lineTo(x, sigY);
          }
          ctx.lineTo(x + TICK_WIDTH, sigY);
        }
        prevSig = sig;
      });
      ctx.stroke();

      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_HEIGHT);
      ctx.lineTo(W, y + ROW_HEIGHT);
      ctx.stroke();
    });

    // Label/content separator
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LABEL_WIDTH, 0);
    ctx.lineTo(LABEL_WIDTH, H);
    ctx.stroke();

    // Tick grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= maxTicks; i++) {
      const x = LABEL_WIDTH + i * TICK_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  }, [probes]);

  useEffect(() => {
    draw();
  }, [draw, simulation.tick]);

  function handleExportCSV() {
    const lines = probes.map(p =>
      `${p.label},${p.history.map(v => (v === SignalValue.HIGH ? '1' : v === SignalValue.LOW ? '0' : 'X')).join(',')}`
    );
    const csv = ['Signal,' + [...Array(probes[0]?.history.length ?? 0).keys()].join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'waveform.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-1 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--toolbar-bg)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {probes.length} probe{probes.length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleExportCSV}
          disabled={probes.length === 0}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-40"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          title="Export as CSV"
        >
          <Download size={11} /> CSV
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {probes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-muted)' }}>
            <BarChart2Icon />
            <div className="text-sm">No probes added</div>
            <div className="text-xs">Select a component and click "Add Waveform Probe"</div>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              width={800}
              height={probes.length * ROW_HEIGHT}
              style={{ imageRendering: 'pixelated' }}
            />
            {/* Probe remove buttons */}
            <div className="absolute left-0 top-0 flex flex-col pointer-events-none">
              {probes.map((probe, _i) => (
                <div
                  key={probe.id}
                  className="flex items-center justify-end pointer-events-auto"
                  style={{ height: ROW_HEIGHT, width: LABEL_WIDTH }}
                >
                  <button
                    onClick={() => removeProbe(probe.id)}
                    className="mr-1 p-0.5 rounded hover:bg-red-500/20 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ color: '#ef4444' }}
                    title="Remove probe"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BarChart2Icon() {
  return <BarChart2 size={28} className="opacity-30" />;
}

import { BarChart2 } from 'lucide-react';
