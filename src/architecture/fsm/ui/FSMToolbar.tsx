/**
 * FSM Toolbar — Header control bar for the FSM Visual Designer.
 */
import React from 'react';
import {
  Plus,
  Play,
  RotateCcw,
  Download,
  Upload,
  LayoutGrid,
  CheckCircle2,
  Cpu,
  Minimize2,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { FsmLayoutStrategy } from '../layout/autoLayout';

interface FSMToolbarProps {
  onAddState: () => void;
  onAddTransition: () => void;
  onApplyLayout: (strategy: FsmLayoutStrategy) => void;
  onValidate: () => void;
  onMinimize: () => void;
  onSynthesize: () => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  onReset: () => void;
  errorCount: number;
}

export const FSMToolbar: React.FC<FSMToolbarProps> = ({
  onAddState,
  onAddTransition,
  onApplyLayout,
  onValidate,
  onMinimize,
  onSynthesize,
  onExportJSON,
  onImportJSON,
  onReset,
  errorCount,
}) => {
  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(51, 65, 85, 0.8)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const btnAccentStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'rgba(14, 165, 233, 0.2)',
    borderColor: '#0284c7',
    color: '#38bdf8',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {/* Left actions: Creation & Layout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onAddState} style={btnAccentStyle} title="Add new state (Double-click canvas)">
          <Plus size={14} />
          State
        </button>

        <button onClick={onAddTransition} style={btnStyle} title="Add transition between states">
          <Layers size={14} />
          Transition
        </button>

        <div style={{ width: 1, height: 20, background: '#334155', margin: '0 4px' }} />

        {/* Auto Layout Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LayoutGrid size={14} color="#94a3b8" />
          <select
            onChange={e => onApplyLayout(e.target.value as FsmLayoutStrategy)}
            defaultValue="circular"
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#cbd5e1',
              padding: '5px 8px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <option value="circular">Circular Layout</option>
            <option value="hierarchical">Hierarchical Layout</option>
            <option value="grid">Grid Layout</option>
            <option value="force">Force-Directed Layout</option>
          </select>
        </div>

        <button onClick={onMinimize} style={btnStyle} title="Run State Minimization (Partition Refinement)">
          <Sparkles size={14} color="#a855f7" />
          Minimize
        </button>
      </div>

      {/* Right actions: Diagnostics, Synthesis, Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onValidate}
          style={{
            ...btnStyle,
            borderColor: errorCount > 0 ? '#ef4444' : 'rgba(51, 65, 85, 0.8)',
            color: errorCount > 0 ? '#f87171' : '#e2e8f0',
          }}
          title="Run FSM Validation"
        >
          <CheckCircle2 size={14} color={errorCount > 0 ? '#ef4444' : '#10b981'} />
          Validate {errorCount > 0 ? `(${errorCount})` : ''}
        </button>

        <button onClick={onSynthesize} style={btnAccentStyle} title="Synthesize excitation tables and flip-flop equations">
          <Cpu size={14} />
          Synthesize
        </button>

        <div style={{ width: 1, height: 20, background: '#334155', margin: '0 4px' }} />

        <button onClick={onImportJSON} style={btnStyle} title="Import FSM JSON">
          <Upload size={14} />
          Import
        </button>

        <button onClick={onExportJSON} style={btnStyle} title="Export FSM JSON">
          <Download size={14} />
          Export
        </button>

        <button onClick={onReset} style={{ ...btnStyle, color: '#f87171' }} title="Reset to blank FSM">
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
