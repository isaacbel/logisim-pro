/**
 * FSM Simulation Panel — Real-time interactive finite state machine simulator.
 * Controls: Run, Pause, Step, Reset, Speed, Input toggle.
 * Displays: Current state, Input, Next state preview, Output, Clock, History log.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { FsmMachine, FsmStepResult } from '../../engine/fsmTypes';
import { stepFSM } from '../../engine/fsmEvaluator';
import { encodeStates } from '../../engine/fsmEncoder';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface FSMSimulationPanelProps {
  machine: FsmMachine;
  currentStateId: string | null;
  onStateChange: (stateId: string, transitionId: string | null) => void;
  onRecordHistory?: (entry: { cycle: number; state: string; input: string; output: string }) => void;
}

export const FSMSimulationPanel: React.FC<FSMSimulationPanelProps> = ({
  machine,
  currentStateId,
  onStateChange,
  onRecordHistory,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [speedMs, setSpeedMs] = useState(600);
  const [currentInput, setCurrentInput] = useState('0');
  const [cycleCount, setCycleCount] = useState(0);
  const [history, setHistory] = useState<Array<{ cycle: number; from: string; input: string; to: string; output: string }>>([]);

  const timerRef = useRef<number | null>(null);

  const initial = machine.states.find(s => s.isInitial) ?? machine.states[0];
  const activeId = currentStateId ?? initial?.id ?? null;
  const stateById = new Map<string, FsmMachine['states'][0]>(machine.states.map(s => [s.id, s] as [string, FsmMachine['states'][0]]));
  const encodingMap = encodeStates(machine.states, machine.encoding ?? 'binary');

  const activeState = activeId ? stateById.get(activeId) : null;

  // Single step execution
  const doStep = useCallback(() => {
    if (!activeId) return;

    const result: FsmStepResult = stepFSM(machine, activeId, currentInput);
    const nextId = result.nextStateId ?? activeId;
    const fromName = stateById.get(activeId)?.name ?? activeId;
    const toName = stateById.get(nextId)?.name ?? nextId;

    const nextCycle = cycleCount + 1;
    setCycleCount(nextCycle);

    const histEntry = {
      cycle: nextCycle,
      from: fromName,
      input: currentInput,
      to: toName,
      output: result.output,
    };
    setHistory(prev => [histEntry, ...prev.slice(0, 49)]);
    onRecordHistory?.({ cycle: nextCycle, state: fromName, input: currentInput, output: result.output });

    onStateChange(nextId, result.transitionId);
  }, [machine, activeId, currentInput, cycleCount, stateById, onStateChange, onRecordHistory]);

  // Run loop
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = window.setInterval(() => {
      doStep();
    }, speedMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, speedMs, doStep]);

  const handleReset = () => {
    setIsRunning(false);
    setCycleCount(0);
    setHistory([]);
    if (initial) {
      onStateChange(initial.id, null);
    }
  };

  const preview = activeId ? stepFSM(machine, activeId, currentInput) : null;
  const previewNextState = preview?.nextStateId ? stateById.get(preview.nextStateId) : null;

  const cardStyle: React.CSSProperties = {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 110,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#090d16', padding: 12, gap: 12, overflowY: 'auto' }}>
      {/* 1. Simulator Controls Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: isRunning ? '#ef4444' : '#10b981',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? 'Pause' : 'Run'}
          </button>

          <button
            onClick={doStep}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.5 : 1,
            }}
          >
            <SkipForward size={14} />
            Step Clock
          </button>

          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#94a3b8',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>

        {/* Speed Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Period: {speedMs}ms</span>
          <input
            type="range"
            min={100}
            max={1500}
            step={50}
            value={speedMs}
            onChange={e => setSpeedMs(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </div>
      </div>

      {/* 2. Live Register & Signal State Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {/* Cycle Count */}
        <div style={cardStyle}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Clock Cycle</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
            #{cycleCount}
          </span>
        </div>

        {/* Current State */}
        <div style={{ ...cardStyle, borderColor: '#34d399' }}>
          <span style={{ fontSize: 10, color: '#34d399', textTransform: 'uppercase' }}>Current State (Q)</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
              {activeState?.name ?? '—'}
            </span>
            <span style={{ fontSize: 11, color: '#6ee7b7', fontFamily: 'monospace' }}>
              [{activeState ? encodingMap.get(activeState.id) : '—'}]
            </span>
          </div>
        </div>

        {/* Input Stimulus */}
        <div style={cardStyle}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Input Condition</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              value={currentInput}
              onChange={e => setCurrentInput(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 4,
                padding: '3px 8px',
                color: '#fbbf24',
                fontSize: 14,
                fontWeight: 700,
                width: 60,
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => setCurrentInput(prev => (prev === '0' ? '1' : prev === '1' ? '0' : prev))}
              style={{
                background: '#334155',
                border: 'none',
                borderRadius: 4,
                color: '#f8fafc',
                padding: '2px 8px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Next State Preview */}
        <div style={cardStyle}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Next State (Q+)</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: previewNextState ? '#a855f7' : '#64748b', fontFamily: 'monospace' }}>
            {previewNextState?.name ?? '(No match)'}
          </span>
        </div>

        {/* Output */}
        <div style={cardStyle}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Output (Z)</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
            {preview?.output ?? activeState?.output ?? '—'}
          </span>
        </div>
      </div>

      {/* 3. Transition Trace Log */}
      <div style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '6px 12px', background: 'rgba(51, 65, 85, 0.4)', borderBottom: '1px solid #334155', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
          Execution History Log
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {history.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              Press "Step Clock" or "Run" to begin simulation.
            </div>
          ) : (
            history.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '4px 8px',
                  borderBottom: '1px solid #334155',
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
              >
                <span style={{ color: '#64748b', width: 40 }}>#{h.cycle}</span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{h.from}</span>
                <span style={{ color: '#94a3b8' }}>──[{h.input}]──&gt;</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>{h.to}</span>
                <span style={{ color: '#fbbf24', marginLeft: 'auto' }}>out: {h.output}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
