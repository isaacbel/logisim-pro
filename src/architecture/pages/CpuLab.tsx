import { useState, useMemo, useEffect, useRef } from 'react';
import { CpuState, createInitialCpuState, stepCpu, PipelineStage } from '../engine/cpuEngine';
import { assembleProgram, SAMPLE_PROGRAMS } from '../engine/assembler';
import { Cpu, Play, Pause, StepForward, RotateCcw } from 'lucide-react';

export function CpuLab() {
  const [selectedProgIdx, setSelectedProgIdx] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const speedMs = 400;

  const prog = useMemo(() => {
    return assembleProgram(SAMPLE_PROGRAMS[selectedProgIdx].code);
  }, [selectedProgIdx]);

  const [cpuState, setCpuState] = useState<CpuState>(() => createInitialCpuState(prog.machineCode));

  const timerRef = useRef<number | null>(null);

  const handleStep = () => {
    if (cpuState.halted) return;
    setCpuState(prev => stepCpu(prev, prog.machineCode));
  };

  const handleReset = () => {
    setIsRunning(false);
    setCpuState(createInitialCpuState(prog.machineCode));
  };

  useEffect(() => {
    if (isRunning && !cpuState.halted) {
      timerRef.current = window.setTimeout(() => {
        setCpuState(prev => {
          const next = stepCpu(prev, prog.machineCode);
          if (next.halted) setIsRunning(false);
          return next;
        });
      }, speedMs);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, cpuState, speedMs, prog.machineCode]);

  const STAGES: { id: PipelineStage; name: string; desc: string; color: string }[] = [
    { id: 'IF', name: '1. FETCH (IF)', desc: 'Read instruction from Instruction ROM', color: '#38bdf8' },
    { id: 'ID', name: '2. DECODE (ID)', desc: 'Decode opcode and read source registers Rs, Rt', color: '#cba6f7' },
    { id: 'EX', name: '3. EXECUTE (EX)', desc: 'ALU computation and flag generation', color: '#10b981' },
    { id: 'MEM', name: '4. MEMORY (MEM)', desc: 'Data RAM read / write', color: '#f59e0b' },
    { id: 'WB', name: '5. WRITEBACK (WB)', desc: 'Write result back into destination register Rd', color: '#ec4899' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Cpu size={22} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Microprocessor Lab & 5-Stage Pipeline
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Complete micro-architectural simulator showing all 5 hardware execution stages: Fetch, Decode, Execute, Memory, Writeback.
          </p>
        </div>

        {/* Execution Controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={cpuState.halted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${isRunning ? '#ef4444' : '#10b981'}`,
              background: isRunning ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
              color: isRunning ? '#ef4444' : '#10b981',
              fontSize: 12,
              fontWeight: 800,
              cursor: cpuState.halted ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            <span>{isRunning ? 'Pause' : 'Run'}</span>
          </button>

          <button
            onClick={handleStep}
            disabled={isRunning || cpuState.halted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'rgba(59,130,246,0.15)',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 700,
              cursor: (isRunning || cpuState.halted) ? 'not-allowed' : 'pointer',
            }}
          >
            <StepForward size={14} />
            <span>Next Cycle</span>
          </button>

          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── PROGRAM SELECTOR STRIP ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CPU Program:</span>
        {SAMPLE_PROGRAMS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedProgIdx(idx);
              const newProg = assembleProgram(p.code);
              setCpuState(createInitialCpuState(newProg.machineCode));
              setIsRunning(false);
            }}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: `1px solid ${selectedProgIdx === idx ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedProgIdx === idx ? 'rgba(59,130,246,0.18)' : 'var(--surface-2)',
              color: selectedProgIdx === idx ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* ── 5-STAGE PIPELINE VISUALIZER ───────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            Execution Pipeline & Inter-Stage Registers
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Elapsed cycles: <strong style={{ color: '#10b981' }}>{cpuState.cycleCount}</strong>
          </div>
        </div>

        {/* 5 Stages Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {STAGES.map(stage => {
            return (
              <div
                key={stage.id}
                style={{
                  background: 'var(--surface-2)',
                  border: `2px solid ${stage.color}`,
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: stage.color }}>
                  {stage.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {stage.desc}
                </div>
                <div style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)',
                  marginTop: 4,
                  padding: 6,
                  background: 'var(--surface-1)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                }}>
                  {cpuState.stageDetails[stage.id]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── REGISTERS & MEMORY STATE GRID ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
      }}>
        {/* Registers Bank */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            Register File (R0..R7)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {cpuState.registers.map((val, idx) => (
              <div
                key={idx}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>R{idx}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)' }}>
                  0x{val.toString(16).toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  ({val})
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RAM State */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            Data RAM (64 Bytes)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, fontFamily: 'monospace', fontSize: 10 }}>
            {cpuState.ram.slice(0, 32).map((val, idx) => (
              <div
                key={idx}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  background: val > 0 ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                  border: `1px solid ${val > 0 ? '#10b981' : 'var(--border)'}`,
                  textAlign: 'center',
                }}
              >
                <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>[{idx}]</div>
                <div style={{ fontWeight: 800, color: val > 0 ? '#10b981' : 'var(--text-primary)' }}>
                  0x{val.toString(16).toUpperCase().padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
