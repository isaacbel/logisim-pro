/**
 * LOGISIM PRO — PROFESSIONAL FSM VISUAL DESIGNER
 *
 * Full-featured visual diagram editor for Moore and Mealy Finite State Machines.
 * Features:
 * - Interactive SVG Diagram Canvas (Pan, Zoom, Snapping, State & Transition Dragging)
 * - Synchronized Transition Truth Table
 * - Real-Time Step/Run Simulator with Clock & Pulse Animation
 * - Digital Waveform Timing Diagram with CSV Export
 * - Comprehensive Diagnostic Rule Verification Engine
 * - Partition Refinement State Minimization with Confirmation
 * - D / JK / T Flip-Flop Excitation Synthesis with Quine-McCluskey Optimization
 * - Real Schematic Synthesis directly onto Logisim Circuit Canvas
 * - JSON Import / Export & Backward Compatibility
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { nanoid } from 'nanoid';
import {
  type FsmMachine,
  type FsmState,
  type FsmTransition,
  type FlipFlopType,
  type SynthesisResult,
  type ValidationResult,
  type MinimizationResult,
  createBlankMachine,
  synthesizeFSM,
  validateFSM,
  minimizeFSM,
  synthesizeToCircuit,
} from '../engine/fsmEngine';
import { applyAutoLayout, type FsmLayoutStrategy } from '../fsm/layout/autoLayout';
import { FSMCanvas } from '../fsm/ui/FSMCanvas';
import { FSMToolbar } from '../fsm/ui/FSMToolbar';
import { FSMInspector } from '../fsm/ui/FSMInspector';
import { FSMTable } from '../fsm/ui/FSMTable';
import { FSMSimulationPanel } from '../fsm/ui/FSMSimulationPanel';
import { FSMWaveform, type WaveformSample } from '../fsm/ui/FSMWaveform';
import { FSMValidationPanel } from '../fsm/ui/FSMValidationPanel';
import { useAppStore } from '@state/store';
import { Cpu, Table, Activity, LineChart, CheckCircle2, Sparkles, Send } from 'lucide-react';

type FsmBottomTab = 'table' | 'simulate' | 'waveform' | 'validation' | 'synthesis';

export function FsmDesigner() {
  const [machine, setMachine] = useState<FsmMachine>(() => {
    const m = createBlankMachine('Moore');
    // Pre-populate with a clean starter 2-state Moore FSM
    const s0: FsmState = { id: nanoid(), name: 'S0', x: 260, y: 220, isInitial: true, output: '0' };
    const s1: FsmState = { id: nanoid(), name: 'S1', x: 500, y: 220, isInitial: false, output: '1' };
    m.states = [s0, s1];
    m.transitions = [
      { id: nanoid(), fromState: s0.id, toState: s0.id, input: '0' },
      { id: nanoid(), fromState: s0.id, toState: s1.id, input: '1' },
      { id: nanoid(), fromState: s1.id, toState: s0.id, input: '0' },
      { id: nanoid(), fromState: s1.id, toState: s1.id, input: '1' },
    ];
    return m;
  });

  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [activeStateId, setActiveStateId] = useState<string | null>(null);
  const [activeTransitionId, setActiveTransitionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FsmBottomTab>('table');
  const [ffType, setFfType] = useState<FlipFlopType>('D');

  // Waveform samples
  const [waveformSamples, setWaveformSamples] = useState<WaveformSample[]>([]);

  // Minimization modal preview state
  const [minimizationPreview, setMinimizationPreview] = useState<MinimizationResult | null>(null);

  // Auto-synthesis computation
  const synthesis = useMemo<SynthesisResult | null>(() => {
    if (machine.states.length < 1) return null;
    try {
      return synthesizeFSM(machine, ffType);
    } catch {
      return null;
    }
  }, [machine, ffType]);

  // Validation report
  const validationResults = useMemo<ValidationResult[]>(() => validateFSM(machine), [machine]);
  const errorCount = validationResults.filter(r => r.severity === 'error').length;

  const errorStateIds = useMemo(() => {
    const set = new Set<string>();
    validationResults.forEach(r => {
      if (r.severity === 'error' && r.stateId) set.add(r.stateId);
    });
    return set;
  }, [validationResults]);

  const errorTransitionIds = useMemo(() => {
    const set = new Set<string>();
    validationResults.forEach(r => {
      if (r.severity === 'error' && r.transitionId) set.add(r.transitionId);
    });
    return set;
  }, [validationResults]);

  const unreachableStateIds = useMemo(() => {
    const set = new Set<string>();
    validationResults.forEach(r => {
      if (r.message.includes('unreachable') && r.stateId) set.add(r.stateId);
    });
    return set;
  }, [validationResults]);

  // ── State & Transition Mutations ──────────────────────────────────────────

  const handleAddStateAt = (x: number, y: number) => {
    const n = machine.states.length;
    const newState: FsmState = {
      id: nanoid(),
      name: `S${n}`,
      x,
      y,
      isInitial: n === 0,
      output: machine.type === 'Moore' ? '0' : undefined,
    };
    setMachine(prev => ({ ...prev, states: [...prev.states, newState] }));
    setSelectedStateId(newState.id);
    setSelectedTransitionId(null);
  };

  const handleAddState = () => {
    const n = machine.states.length;
    const angle = (n / 6) * 2 * Math.PI;
    const r = 160;
    handleAddStateAt(Math.round(380 + r * Math.cos(angle)), Math.round(240 + r * Math.sin(angle)));
  };

  const handleDeleteState = (id: string) => {
    setMachine(prev => ({
      ...prev,
      states: prev.states.filter(s => s.id !== id),
      transitions: prev.transitions.filter(t => t.fromState !== id && t.toState !== id),
    }));
    if (selectedStateId === id) setSelectedStateId(null);
  };

  const handleMoveState = useCallback((id: string, x: number, y: number) => {
    setMachine(prev => ({
      ...prev,
      states: prev.states.map(s => (s.id === id ? { ...s, x, y } : s)),
    }));
  }, []);

  const handleAddTransition = (fromId?: string, toId?: string) => {
    if (machine.states.length === 0) return;
    const from = fromId ?? machine.states[0].id;
    const to = toId ?? machine.states[machine.states.length > 1 ? 1 : 0].id;
    const newTr: FsmTransition = {
      id: nanoid(),
      fromState: from,
      toState: to,
      input: '0',
      output: machine.type === 'Mealy' ? '0' : undefined,
    };
    setMachine(prev => ({ ...prev, transitions: [...prev.transitions, newTr] }));
    setSelectedTransitionId(newTr.id);
    setSelectedStateId(null);
  };

  const handleDeleteTransition = (id: string) => {
    setMachine(prev => ({
      ...prev,
      transitions: prev.transitions.filter(t => t.id !== id),
    }));
    if (selectedTransitionId === id) setSelectedTransitionId(null);
  };

  // Auto Layout
  const handleApplyLayout = (strategy: FsmLayoutStrategy) => {
    setMachine(prev => applyAutoLayout(prev, strategy));
  };

  // State Minimization
  const handleRunMinimization = () => {
    const result = minimizeFSM(machine);
    setMinimizationPreview(result);
  };

  const handleApplyMinimization = () => {
    if (minimizationPreview) {
      setMachine(minimizationPreview.minimizedMachine);
      setMinimizationPreview(null);
    }
  };

  // Real Schematic Synthesis directly to Logisim Canvas
  const handleExportToLogisim = () => {
    if (!synthesis) return;
    const circuit = synthesizeToCircuit(synthesis);
    useAppStore.getState().importGeneratedCircuit(circuit.components, circuit.wires);
  };

  // Import / Export JSON
  const handleExportJSON = () => {
    const data = JSON.stringify({ machine, synthesis }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${machine.name.replace(/\s+/g, '_')}_fsm.json`;
    a.click();
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (parsed.machine) {
            setMachine(parsed.machine);
          } else if (parsed.states) {
            setMachine(parsed);
          }
        } catch {
          alert('Invalid FSM JSON file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm('Reset to a blank new FSM?')) {
      setMachine(createBlankMachine('Moore'));
      setSelectedStateId(null);
      setSelectedTransitionId(null);
      setWaveformSamples([]);
    }
  };

  const selectedState = machine.states.find(s => s.id === selectedStateId) ?? null;
  const selectedTransition = machine.transitions.find(t => t.id === selectedTransitionId) ?? null;

  const tabBtnStyle = (tab: FsmBottomTab): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: activeTab === tab ? '#1e293b' : 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #38bdf8' : '2px solid transparent',
    color: activeTab === tab ? '#38bdf8' : '#94a3b8',
    fontSize: 12,
    fontWeight: activeTab === tab ? 700 : 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#090d16', overflow: 'hidden' }}>
      {/* 1. Header Toolbar */}
      <FSMToolbar
        onAddState={handleAddState}
        onAddTransition={() => handleAddTransition()}
        onApplyLayout={handleApplyLayout}
        onValidate={() => setActiveTab('validation')}
        onMinimize={handleRunMinimization}
        onSynthesize={() => setActiveTab('synthesis')}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onReset={handleReset}
        errorCount={errorCount}
      />

      {/* 2. Main Workspace (Canvas + Inspector) */}
      <div style={{ display: 'flex', flex: '1 1 55%', minHeight: 0, borderBottom: '1px solid #1e293b' }}>
        {/* Canvas Area */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <FSMCanvas
            machine={machine}
            selectedStateId={selectedStateId}
            selectedTransitionId={selectedTransitionId}
            activeStateId={activeStateId}
            activeTransitionId={activeTransitionId}
            errorStateIds={errorStateIds}
            errorTransitionIds={errorTransitionIds}
            unreachableStateIds={unreachableStateIds}
            onSelectState={id => {
              setSelectedStateId(id);
              if (id) setSelectedTransitionId(null);
            }}
            onSelectTransition={id => {
              setSelectedTransitionId(id);
              if (id) setSelectedStateId(null);
            }}
            onMoveState={handleMoveState}
            onAddTransition={(from, to) => handleAddTransition(from, to)}
            onAddStateAt={handleAddStateAt}
          />
        </div>

        {/* Inspector Panel */}
        <FSMInspector
          machine={machine}
          selectedState={selectedState}
          selectedTransition={selectedTransition}
          ffType={ffType}
          onChangeMachine={patch => setMachine(m => ({ ...m, ...patch }))}
          onChangeState={(id, patch) =>
            setMachine(m => ({
              ...m,
              states: m.states.map(s => (s.id === id ? { ...s, ...patch } : s)),
            }))
          }
          onDeleteState={handleDeleteState}
          onChangeTransition={(id, patch) =>
            setMachine(m => ({
              ...m,
              transitions: m.transitions.map(t => (t.id === id ? { ...t, ...patch } : t)),
            }))
          }
          onDeleteTransition={handleDeleteTransition}
          onChangeFfType={setFfType}
          onAddTransitionFrom={fromId => handleAddTransition(fromId)}
        />
      </div>

      {/* 3. Bottom Synchronized Workspace Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 45%', minHeight: 180, background: '#0f172a' }}>
        {/* Tab Navigation Header */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#090d16', borderBottom: '1px solid #1e293b', paddingLeft: 8 }}>
          <button onClick={() => setActiveTab('table')} style={tabBtnStyle('table')}>
            <Table size={13} /> Transition Table
          </button>
          <button onClick={() => setActiveTab('simulate')} style={tabBtnStyle('simulate')}>
            <Activity size={13} /> Live Simulator
          </button>
          <button onClick={() => setActiveTab('waveform')} style={tabBtnStyle('waveform')}>
            <LineChart size={13} /> Waveform
          </button>
          <button onClick={() => setActiveTab('validation')} style={tabBtnStyle('validation')}>
            <CheckCircle2 size={13} /> Diagnostics {errorCount > 0 ? `(${errorCount})` : ''}
          </button>
          <button onClick={() => setActiveTab('synthesis')} style={tabBtnStyle('synthesis')}>
            <Cpu size={13} /> Synthesis Equations
          </button>
        </div>

        {/* Tab Content View */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {activeTab === 'table' && (
            <FSMTable machine={machine} onUpdateMachine={setMachine} />
          )}

          {activeTab === 'simulate' && (
            <FSMSimulationPanel
              machine={machine}
              currentStateId={activeStateId}
              onStateChange={(stateId, transitionId) => {
                setActiveStateId(stateId);
                setActiveTransitionId(transitionId);
              }}
              onRecordHistory={entry => setWaveformSamples(prev => [...prev.slice(-99), entry])}
            />
          )}

          {activeTab === 'waveform' && (
            <FSMWaveform samples={waveformSamples} />
          )}

          {activeTab === 'validation' && (
            <FSMValidationPanel
              results={validationResults}
              onSelectState={id => {
                setSelectedStateId(id);
                setSelectedTransitionId(null);
              }}
              onSelectTransition={id => {
                setSelectedTransitionId(id);
                setSelectedStateId(null);
              }}
            />
          )}

          {activeTab === 'synthesis' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                  Excitation & Output Equations ({ffType} Flip-Flops)
                </span>
                <button
                  onClick={handleExportToLogisim}
                  disabled={!synthesis}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: synthesis ? 'pointer' : 'not-allowed',
                    opacity: synthesis ? 1 : 0.5,
                  }}
                >
                  <Send size={13} />
                  Export Real Circuit to Logisim Canvas
                </button>
              </div>

              {!synthesis ? (
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  Add at least 2 states with transitions to compute synthesis equations.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {Object.entries(synthesis.equations).map(([sig, eq]) => (
                    <div
                      key={sig}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                        Signal {sig}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', fontFamily: 'ui-monospace, monospace' }}>
                        {sig} = {eq || '0'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. State Minimization Confirmation Modal */}
      {minimizationPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: 480,
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#a855f7" />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                FSM State Minimization Result
              </span>
            </div>

            {minimizationPreview.isAlreadyMinimal ? (
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                This FSM is <strong>already minimal</strong>. No equivalent redundant states were detected.
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 12 }}>
                  Partition refinement detected equivalent states. Applying minimization will reduce the state count from{' '}
                  <strong style={{ color: '#f87171' }}>{machine.states.length} states</strong> to{' '}
                  <strong style={{ color: '#34d399' }}>{minimizationPreview.minimizedMachine.states.length} states</strong>.
                </p>

                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase' }}>
                    Equivalent State Clusters:
                  </span>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 12, color: '#e2e8f0' }}>
                    {minimizationPreview.equivalentGroups.map((grp, i) => (
                      <li key={i}>
                        Merged cluster: {grp.map(id => machine.states.find(s => s.id === id)?.name ?? id).join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setMinimizationPreview(null)}
                style={{
                  padding: '8px 16px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>

              {!minimizationPreview.isAlreadyMinimal && (
                <button
                  onClick={handleApplyMinimization}
                  style={{
                    padding: '8px 16px',
                    background: '#a855f7',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Apply Minimization
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
