/**
 * FSM Inspector — Context-sensitive properties panel for editing
 * state, transition, and global machine parameters.
 */
import React from 'react';
import type {
  FsmMachine,
  FsmState,
  FsmTransition,
  FsmType,
  FlipFlopType,
  StateEncoding,
} from '../../engine/fsmTypes';
import { Trash2, Plus, Settings } from 'lucide-react';

interface FSMInspectorProps {
  machine: FsmMachine;
  selectedState: FsmState | null;
  selectedTransition: FsmTransition | null;
  ffType: FlipFlopType;
  onChangeMachine: (patch: Partial<FsmMachine>) => void;
  onChangeState: (id: string, patch: Partial<FsmState>) => void;
  onDeleteState: (id: string) => void;
  onChangeTransition: (id: string, patch: Partial<FsmTransition>) => void;
  onDeleteTransition: (id: string) => void;
  onChangeFfType: (ff: FlipFlopType) => void;
  onAddTransitionFrom: (fromId: string) => void;
}

export const FSMInspector: React.FC<FSMInspectorProps> = ({
  machine,
  selectedState,
  selectedTransition,
  ffType,
  onChangeMachine,
  onChangeState,
  onDeleteState,
  onChangeTransition,
  onDeleteTransition,
  onChangeFfType,
  onAddTransitionFrom,
}) => {



  const sectionStyle: React.CSSProperties = {
    background: '#1e293b',
    borderRadius: 8,
    border: '1px solid #334155',
    marginBottom: 12,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(56, 189, 248, 0.08)',
    borderBottom: '1px solid #334155',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#38bdf8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const fieldStyle: React.CSSProperties = {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500,
  };

  const inputStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 12,
    color: '#f8fafc',
    outline: 'none',
    fontFamily: 'ui-monospace, monospace',
  };

  const deleteBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    padding: '6px 12px',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    color: '#f87171',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 8,
  };

  return (
    <div
      style={{
        width: 280,
        height: '100%',
        background: '#0f172a',
        borderLeft: '1px solid #1e293b',
        padding: 12,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Selected State Properties ─────────────────────────── */}
      {selectedState && (
        <div style={sectionStyle}>
          <div style={headerStyle}>
            <span>State: {selectedState.name}</span>
            <button
              onClick={() => onAddTransitionFrom(selectedState.id)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontSize: 11 }}
              title="Add outgoing transition"
            >
              <Plus size={12} /> Out
            </button>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={selectedState.name}
              onChange={e => onChangeState(selectedState.id, { name: e.target.value })}
            />
          </div>

          {machine.type === 'Moore' && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Output (Moore)</label>
              <input
                style={inputStyle}
                value={selectedState.output ?? ''}
                placeholder="e.g. 0 or 01"
                onChange={e => onChangeState(selectedState.id, { output: e.target.value })}
              />
            </div>
          )}

          <div style={{ ...fieldStyle, flexDirection: 'row', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#e2e8f0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedState.isInitial}
                onChange={e => {
                  // Ensure single initial state
                  if (e.target.checked) {
                    machine.states.forEach(s => {
                      if (s.id !== selectedState.id && s.isInitial) {
                        onChangeState(s.id, { isInitial: false });
                      }
                    });
                  }
                  onChangeState(selectedState.id, { isInitial: e.target.checked });
                }}
              />
              Initial State
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#e2e8f0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!selectedState.isFinal}
                onChange={e => onChangeState(selectedState.id, { isFinal: e.target.checked })}
              />
              Accept State
            </label>
          </div>

          <div style={{ padding: '0 12px 12px 12px' }}>
            <button onClick={() => onDeleteState(selectedState.id)} style={deleteBtnStyle}>
              <Trash2 size={13} />
              Delete State
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Selected Transition Properties ─────────────────────── */}
      {selectedTransition && (
        <div style={sectionStyle}>
          <div style={headerStyle}>
            <span>Transition</span>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>From State</label>
            <select
              style={inputStyle}
              value={selectedTransition.fromState}
              onChange={e => onChangeTransition(selectedTransition.id, { fromState: e.target.value })}
            >
              {machine.states.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>To State</label>
            <select
              style={inputStyle}
              value={selectedTransition.toState}
              onChange={e => onChangeTransition(selectedTransition.id, { toState: e.target.value })}
            >
              {machine.states.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Input Condition</label>
            <input
              style={inputStyle}
              value={selectedTransition.input}
              placeholder="e.g. 0, 1, 01, X"
              onChange={e => onChangeTransition(selectedTransition.id, { input: e.target.value })}
            />
          </div>

          {machine.type === 'Mealy' && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Output (Mealy)</label>
              <input
                style={inputStyle}
                value={selectedTransition.output ?? ''}
                placeholder="e.g. 0 or 1"
                onChange={e => onChangeTransition(selectedTransition.id, { output: e.target.value })}
              />
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Priority</label>
            <input
              type="number"
              style={inputStyle}
              value={selectedTransition.priority ?? 1}
              onChange={e => onChangeTransition(selectedTransition.id, { priority: Number(e.target.value) })}
            />
          </div>

          <div style={{ padding: '0 12px 12px 12px' }}>
            <button onClick={() => onDeleteTransition(selectedTransition.id)} style={deleteBtnStyle}>
              <Trash2 size={13} />
              Delete Transition
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Machine Global Settings ────────────────────────────── */}
      <div style={sectionStyle}>
        <div style={headerStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={12} /> Machine Settings
          </span>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Name</label>
          <input
            style={inputStyle}
            value={machine.name}
            onChange={e => onChangeMachine({ name: e.target.value })}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>FSM Architecture</label>
          <select
            style={inputStyle}
            value={machine.type}
            onChange={e => onChangeMachine({ type: e.target.value as FsmType })}
          >
            <option value="Moore">Moore (Output on State)</option>
            <option value="Mealy">Mealy (Output on Transition)</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Flip-Flop Target</label>
          <select
            style={inputStyle}
            value={ffType}
            onChange={e => onChangeFfType(e.target.value as FlipFlopType)}
          >
            <option value="D">D Flip-Flop</option>
            <option value="JK">JK Flip-Flop</option>
            <option value="T">T Flip-Flop</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>State Encoding</label>
          <select
            style={inputStyle}
            value={machine.encoding ?? 'binary'}
            onChange={e => onChangeMachine({ encoding: e.target.value as StateEncoding })}
          >
            <option value="binary">Binary (Sequential)</option>
            <option value="gray">Gray Code (Min Transitions)</option>
            <option value="one-hot">One-Hot (Fast Decode)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Input Bits</label>
            <input
              type="number"
              min={1}
              max={8}
              style={inputStyle}
              value={machine.inputBits}
              onChange={e => onChangeMachine({ inputBits: Math.max(1, Number(e.target.value)) })}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Output Bits</label>
            <input
              type="number"
              min={1}
              max={8}
              style={inputStyle}
              value={machine.outputBits}
              onChange={e => onChangeMachine({ outputBits: Math.max(1, Number(e.target.value)) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
