import { useRef } from 'react';
import { useAppStore } from '@state/store';
import {
  MousePointer, Hand, GitBranch, Square, Type, Trash2,
  Play, Pause, RotateCcw, StepForward, SkipForward,
  Undo2, Redo2, Save, FolderOpen, FilePlus,
  Sun, Moon, Layers, Activity, Zap,
  CircleDot, Home, Cpu,
} from 'lucide-react';
import type { EditorTool, ThemeMode } from '@apptypes/core';
import { simulationService } from '@/services/SimulationService';
import { downloadProject, parseProject } from '@/services/ProjectStorage';

const TOOLS: { id: EditorTool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: 'select',    icon: MousePointer, label: 'Select',          shortcut: 'S' },
  { id: 'pan',       icon: Hand,         label: 'Pan',             shortcut: 'Space' },
  { id: 'wire',      icon: GitBranch,    label: 'Wire',            shortcut: 'W' },
  { id: 'component', icon: Square,       label: 'Place Component', shortcut: 'C' },
  { id: 'probe',     icon: CircleDot,    label: 'Probe Signal',    shortcut: 'P' },
  { id: 'text',      icon: Type,         label: 'Text Label',      shortcut: 'T' },
  { id: 'delete',    icon: Trash2,       label: 'Delete',          shortcut: 'Del' },
];

const THEMES: { id: ThemeMode; icon: React.ElementType; label: string }[] = [
  { id: 'dark',  icon: Moon,   label: 'Dark' },
  { id: 'light', icon: Sun,    label: 'Light' },
  { id: 'glass', icon: Layers, label: 'Glass' },
];

/* ── Divider ── */
function Divider() {
  return <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />;
}

export function Toolbar() {
  const {
    editor, setTool,
    simulation, setSimulationState,
    theme, setTheme,
    undo, redo,
    newProject, loadProjectFile,
    project, probes, viewport,
    logMessage,
    setAppMode, setArchPage, setArchInspectorValue,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleRunPause() {
    if (simulation.isRunning) void simulationService.pause();
    else void simulationService.run();
  }

  function handleAnalyzeSelected() {
    const s = useAppStore.getState();
    const circuit = s.project?.circuits.find(c => c.id === s.currentCircuitId);
    let bitStr = '11010110';
    if (circuit) {
      const selected = circuit.components.filter(c => s.selection.selectedEntityIds.has(c.id));
      if (selected.length > 0) {
        const bits: number[] = [];
        selected.forEach(c => {
          if (c.type === 'CONSTANT_1') bits.push(1);
          else if (c.type === 'CONSTANT_0') bits.push(0);
          else if (c.type === 'SWITCH') bits.push(c.properties?.state === 1 ? 1 : 0);
        });
        if (bits.length > 0) bitStr = bits.join('');
      }
    }
    setArchInspectorValue(bitStr);
    setAppMode('architecture');
    setArchPage('dashboard');
  }

  async function openProject(file: File | undefined) {
    if (!file) return;
    try {
      const loaded = parseProject(await file.text());
      loadProjectFile(loaded.project, loaded.probes, loaded.viewport);
    } catch (error) {
      logMessage('error', error instanceof Error ? error.message : 'Unable to open the project.');
    }
  }

  const btnStyle = (active = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 6,
    border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.1s, color 0.1s',
  });

  return (
    <div className="app-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 44, background: 'var(--toolbar-bg)', borderBottom: '1px solid var(--border)' }}>
      {/* Home Navigation */}
      <button
        onClick={() => setAppMode('welcome')}
        title="Return to Welcome Home"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          color: 'var(--text-primary)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Home size={13} />
        <span>Home</span>
      </button>

      {/* Switch to Architecture Lab */}
      <button
        onClick={() => { setAppMode('architecture'); setArchPage('dashboard'); }}
        title="Open Computer Architecture Laboratory"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid rgba(139,92,246,0.3)',
          background: 'rgba(139,92,246,0.12)',
          color: '#a78bfa',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <Cpu size={13} />
        <span>Arch Lab</span>
      </button>

      <button
        onClick={handleAnalyzeSelected}
        title="Analyze Selected Components in Architecture Lab"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 11,
          fontWeight: 500,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span>Analyze Value</span>
      </button>

      <Divider />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4, flexShrink: 0 }}>
        <Zap size={15} style={{ color: '#60a5fa' }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          Logisim Pro
        </span>
      </div>

      <Divider />

      {/* File operations */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          onClick={newProject}
          title="New Project (Ctrl+N)"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <FilePlus size={15} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Open Project (Ctrl+O)"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <FolderOpen size={15} />
        </button>
        <button
          onClick={() => project && downloadProject(project, probes, viewport)}
          title="Save (Ctrl+S)"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <Save size={15} />
        </button>
      </div>

      {/* Hidden file input — NOT visible to user */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={event => { void openProject(event.target.files?.[0]); event.currentTarget.value = ''; }}
      />

      <Divider />

      {/* Edit operations */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          onClick={undo}
          title="Undo (Ctrl+Z)"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={redo}
          title="Redo (Ctrl+Y)"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <Redo2 size={15} />
        </button>
      </div>

      <Divider />

      {/* Tool palette */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'var(--surface-2)',
        borderRadius: 8,
        padding: 3,
      }}>
        {TOOLS.map(t => {
          const Icon = t.icon;
          const active = editor.currentTool === t.id;
          return (
            <button
              key={t.id}
              id={`tool-${t.id}`}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              style={{
                ...btnStyle(active),
                padding: 5,
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>

      <Divider />

      {/* Simulation controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          id="sim-run-pause"
          onClick={handleRunPause}
          title={simulation.isRunning ? 'Pause (F5)' : 'Run (F5)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5px 10px',
            borderRadius: 6,
            border: 'none',
            background: simulation.isRunning ? '#f59e0b22' : '#10b98122',
            color: simulation.isRunning ? '#f59e0b' : '#10b981',
            cursor: 'pointer',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {simulation.isRunning ? <Pause size={14} /> : <Play size={14} />}
          {simulation.isRunning ? 'Pause' : 'Run'}
        </button>
        <button
          id="sim-step"
          onClick={() => void simulationService.step()}
          title="Step (F6)"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <StepForward size={15} />
        </button>
        <button
          id="sim-fast"
          onClick={() => void simulationService.stepFast(10)}
          title="Step 10 Ticks"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <SkipForward size={15} />
        </button>
        <button
          id="sim-reset"
          onClick={() => void simulationService.reset()}
          title="Reset Simulation (F7)"
          style={btnStyle()}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <RotateCcw size={15} />
        </button>

        {/* Tick counter badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 5,
          background: 'var(--surface-2)',
          color: simulation.isRunning ? '#10b981' : 'var(--text-secondary)',
          fontSize: 11,
          fontFamily: 'monospace',
          flexShrink: 0,
        }}>
          <Activity size={11} style={{ color: simulation.isRunning ? '#10b981' : 'var(--text-muted)' }} />
          T={simulation.tick}
        </div>

        {/* Speed selector */}
        <select
          value={simulation.speed}
          onChange={e => {
            const speed = e.target.value as 'slow' | 'normal' | 'fast' | 'unlimited';
            setSimulationState({ speed });
            void simulationService.setSpeed(speed);
          }}
          title="Simulation Speed"
          style={{
            fontSize: 11,
            borderRadius: 5,
            padding: '3px 6px',
            border: 'none',
            background: 'var(--surface-2)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            outline: 'none',
            flexShrink: 0,
          }}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
          <option value="unlimited">Max</option>
        </select>
      </div>

      {/* Flex spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'var(--surface-2)',
        borderRadius: 8,
        padding: 3,
        flexShrink: 0,
      }}>
        {THEMES.map(({ id, icon: Icon, label }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              title={`${label} Mode`}
              style={btnStyle(active)}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}}
            >
              <Icon size={13} />
            </button>
          );
        })}
      </div>

      {/* Version */}
      <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', flexShrink: 0, paddingLeft: 6 }}>
        v2.0
      </div>
    </div>
  );
}
