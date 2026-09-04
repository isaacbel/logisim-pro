/**
 * FSM Table — Synchronized bidirectional Transition Table.
 * Editing the table immediately updates the graph and vice-versa.
 */
import React from 'react';
import type { FsmMachine } from '../../engine/fsmTypes';
import { buildStateTable } from '../../engine/fsmSynthesis';
import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';

interface FSMTableProps {
  machine: FsmMachine;
  activeRowIndex?: number | null;
  onUpdateMachine: (machine: FsmMachine) => void;
}

export const FSMTable: React.FC<FSMTableProps> = ({
  machine,
  activeRowIndex = null,
  onUpdateMachine,
}) => {
  const tableRows = React.useMemo(() => buildStateTable(machine), [machine]);

  const stateByName = new Map<string, FsmMachine['states'][0]>(machine.states.map(s => [s.name, s] as [string, FsmMachine['states'][0]]));

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    borderRight: '1px solid #334155',
    fontSize: 11,
    fontWeight: 700,
    color: '#38bdf8',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  };

  const tdStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderBottom: '1px solid #1e293b',
    borderRight: '1px solid #1e293b',
    fontSize: 12,
    fontFamily: 'ui-monospace, monospace',
    color: '#f8fafc',
    background: isActive ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
    whiteSpace: 'nowrap',
  });

  const handleAddTransition = () => {
    if (machine.states.length === 0) return;
    const firstState = machine.states[0].id;
    const newTr = {
      id: nanoid(),
      fromState: firstState,
      toState: firstState,
      input: '0',
      output: machine.type === 'Mealy' ? '0' : undefined,
    };
    onUpdateMachine({
      ...machine,
      transitions: [...machine.transitions, newTr],
    });
  };

  const handleDeleteTransition = (index: number) => {
    if (index >= 0 && index < machine.transitions.length) {
      const updated = machine.transitions.filter((_, i) => i !== index);
      onUpdateMachine({
        ...machine,
        transitions: updated,
      });
    }
  };

  const handleUpdateInput = (trIndex: number, newInput: string) => {
    const updated = machine.transitions.map((tr, i) => (i === trIndex ? { ...tr, input: newInput } : tr));
    onUpdateMachine({ ...machine, transitions: updated });
  };

  const handleUpdateNextState = (trIndex: number, nextStateId: string) => {
    const updated = machine.transitions.map((tr, i) => (i === trIndex ? { ...tr, toState: nextStateId } : tr));
    onUpdateMachine({ ...machine, transitions: updated });
  };

  const handleUpdateOutput = (trIndex: number, fromStateId: string, newOutput: string) => {
    if (machine.type === 'Mealy') {
      const updated = machine.transitions.map((tr, i) => (i === trIndex ? { ...tr, output: newOutput } : tr));
      onUpdateMachine({ ...machine, transitions: updated });
    } else {
      // Moore: update state output
      const updatedStates = machine.states.map(s => (s.id === fromStateId ? { ...s, output: newOutput } : s));
      onUpdateMachine({ ...machine, states: updatedStates });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#090d16', overflow: 'hidden' }}>
      {/* Table Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
          State Transition Truth Table ({tableRows.length} transitions)
        </span>
        <button
          onClick={handleAddTransition}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid #0284c7',
            borderRadius: 6,
            color: '#38bdf8',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Add Transition Row
        </button>
      </div>

      {/* Table Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Present State (Q)</th>
              <th style={thStyle}>State Code</th>
              <th style={thStyle}>Input (X)</th>
              <th style={thStyle}>Next State (Q+)</th>
              <th style={thStyle}>Next Code</th>
              <th style={thStyle}>Output (Z)</th>
              <th style={{ ...thStyle, width: 40 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {machine.transitions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                  No transitions defined yet. Click "Add Transition Row" or drag connections on the canvas.
                </td>
              </tr>
            ) : (
              tableRows.map((row, idx) => {
                const tr = machine.transitions[idx];
                if (!tr) return null;
                const isActive = activeRowIndex === idx;

                return (
                  <tr key={tr.id ?? idx} style={{ background: isActive ? 'rgba(52, 211, 153, 0.08)' : undefined }}>
                    <td style={tdStyle(isActive)}>{idx + 1}</td>
                    <td style={{ ...tdStyle(isActive), fontWeight: 700, color: '#38bdf8' }}>{row.currentState}</td>
                    <td style={{ ...tdStyle(isActive), color: '#94a3b8' }}>{row.currentStateCode}</td>
                    <td style={tdStyle(isActive)}>
                      <input
                        value={tr.input}
                        onChange={e => handleUpdateInput(idx, e.target.value)}
                        style={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 4,
                          padding: '2px 6px',
                          color: '#f8fafc',
                          width: 60,
                          fontSize: 12,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      />
                    </td>
                    <td style={tdStyle(isActive)}>
                      <select
                        value={tr.toState}
                        onChange={e => handleUpdateNextState(idx, e.target.value)}
                        style={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 4,
                          padding: '2px 6px',
                          color: '#f8fafc',
                          fontSize: 12,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {machine.states.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...tdStyle(isActive), color: '#94a3b8' }}>{row.nextStateCode}</td>
                    <td style={tdStyle(isActive)}>
                      <input
                        value={machine.type === 'Mealy' ? tr.output ?? '' : stateByName.get(row.currentState)?.output ?? ''}
                        onChange={e => handleUpdateOutput(idx, tr.fromState, e.target.value)}
                        placeholder="out"
                        style={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 4,
                          padding: '2px 6px',
                          color: '#f8fafc',
                          width: 60,
                          fontSize: 12,
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      />
                    </td>
                    <td style={tdStyle(isActive)}>
                      <button
                        onClick={() => handleDeleteTransition(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                        title="Delete Transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
