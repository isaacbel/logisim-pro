import { useState } from 'react';
import { CpuState, createInitialCpuState, stepCpu } from '../engine/cpuEngine';
import { assembleProgram, SAMPLE_PROGRAMS } from '../engine/assembler';
import { GitFork, StepForward, RotateCcw } from 'lucide-react';

export function DatapathLab() {
  const [selectedProgramIdx, setSelectedProgramIdx] = useState<number>(0);
  const [activeWire, setActiveWire] = useState<{ name: string; value: string; desc: string } | null>(null);

  const initialProg = assembleProgram(SAMPLE_PROGRAMS[selectedProgramIdx].code);
  const [cpuState, setCpuState] = useState<CpuState>(() => createInitialCpuState(initialProg.machineCode));

  const handleStep = () => {
    const prog = assembleProgram(SAMPLE_PROGRAMS[selectedProgramIdx].code);
    setCpuState(prev => stepCpu(prev, prog.machineCode));
  };

  const handleReset = () => {
    const prog = assembleProgram(SAMPLE_PROGRAMS[selectedProgramIdx].code);
    setCpuState(createInitialCpuState(prog.machineCode));
    setActiveWire(null);
  };

  const handleProgramChange = (idx: number) => {
    setSelectedProgramIdx(idx);
    const prog = assembleProgram(SAMPLE_PROGRAMS[idx].code);
    setCpuState(createInitialCpuState(prog.machineCode));
    setActiveWire(null);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <GitFork size={22} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Single-Cycle Datapath Lab
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Interactive visualization of instruction flow and live signal buses. Click any component or bus to probe its live signal values.
          </p>
        </div>

        {/* Execution Controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleStep}
            disabled={cpuState.halted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'rgba(59,130,246,0.15)',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 800,
              cursor: cpuState.halted ? 'not-allowed' : 'pointer',
            }}
          >
            <StepForward size={14} />
            <span>Step Instruction</span>
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

      {/* ── PROGRAM SELECTOR ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {SAMPLE_PROGRAMS.map((prog, idx) => (
          <button
            key={idx}
            onClick={() => handleProgramChange(idx)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${selectedProgramIdx === idx ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedProgramIdx === idx ? 'rgba(59,130,246,0.18)' : 'var(--surface-2)',
              color: selectedProgramIdx === idx ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {prog.name}
          </button>
        ))}
      </div>

      {/* ── INTERACTIVE DATAPATH SVG DIAGRAM ──────────────────────────────── */}
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
            Live Architectural Diagram (Single-Cycle MIPS Datapath)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Current instruction: <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{cpuState.currentDisassembly}</strong> (PC={cpuState.pc})
          </div>
        </div>

        {/* Datapath Diagram Card */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: 320,
          background: 'var(--surface-2)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          padding: 16,
        }}>
          {/* Stage 1: PC & Instruction Memory */}
          <div
            onClick={() => setActiveWire({
              name: 'PC / Instruction ROM Bus',
              value: `PC=0x${cpuState.pc.toString(16).toUpperCase()} | IR=0x${cpuState.ir.toString(16).toUpperCase()}`,
              desc: 'The Program Counter holds the address of the current instruction in Instruction Memory.',
            })}
            style={{
              background: 'var(--surface-1)',
              border: '2px solid #38bdf8',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, color: '#38bdf8' }}>1. FETCH (IF)</div>
            <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace' }}>PC: {cpuState.pc}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Instruction ROM:</div>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent)' }}>
              0x{cpuState.ir.toString(16).toUpperCase().padStart(4, '0')}
            </div>
          </div>

          {/* Stage 2: Control Unit & Register File */}
          <div
            onClick={() => setActiveWire({
              name: 'Decode Stage Signals (ID)',
              value: `RegWrite=${cpuState.activeSignals.regWrite ? 1 : 0} | ALUSrc=${cpuState.activeSignals.aluSrc ? 1 : 0} | MemRead=${cpuState.activeSignals.memRead ? 1 : 0}`,
              desc: 'The Control Unit extracts the opcode and asserts hardware control lines to the datapath.',
            })}
            style={{
              background: 'var(--surface-1)',
              border: '2px solid #cba6f7',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, color: '#cba6f7' }}>2. DECODE (ID)</div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>{cpuState.activeSignals.aluOpName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>RegWrite: <strong style={{ color: cpuState.activeSignals.regWrite ? '#10b981' : '#ef4444' }}>{cpuState.activeSignals.regWrite ? 'YES' : 'NO'}</strong></div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ALUSrc: <strong style={{ color: cpuState.activeSignals.aluSrc ? '#f59e0b' : '#38bdf8' }}>{cpuState.activeSignals.aluSrc ? 'Immediate' : 'RegB'}</strong></div>
          </div>

          {/* Stage 3: ALU & Arithmetic Execution */}
          <div
            onClick={() => setActiveWire({
              name: 'Arithmetic Logic Unit (ALU)',
              value: `ALUOp=${cpuState.activeSignals.aluOpName} | Zero=${cpuState.flags.zero ? 1 : 0} | Negative=${cpuState.flags.negative ? 1 : 0}`,
              desc: 'Executes the arithmetic or logic operation on the two input operands.',
            })}
            style={{
              background: 'var(--surface-1)',
              border: '2px solid #10b981',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, color: '#10b981' }}>3. EXECUTE (EX)</div>
            <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: '#10b981' }}>
              ALU: {cpuState.activeSignals.aluOpName}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Flags:</div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              Z={cpuState.flags.zero ? 1 : 0} N={cpuState.flags.negative ? 1 : 0} C={cpuState.flags.carry ? 1 : 0}
            </div>
          </div>

          {/* Stage 4: Data Memory (RAM) */}
          <div
            onClick={() => setActiveWire({
              name: 'Data Memory (RAM)',
              value: `MemRead=${cpuState.activeSignals.memRead ? 1 : 0} | MemWrite=${cpuState.activeSignals.memWrite ? 1 : 0}`,
              desc: 'Memory access stage for LOAD (read) and STORE (write) instructions.',
            })}
            style={{
              background: 'var(--surface-1)',
              border: '2px solid #f59e0b',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, color: '#f59e0b' }}>4. MEMORY (MEM)</div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {cpuState.activeSignals.memRead ? 'RAM Read' : cpuState.activeSignals.memWrite ? 'RAM Write' : 'Idle'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Size: 64 Bytes</div>
          </div>

          {/* Stage 5: Write Back (WB) */}
          <div
            onClick={() => setActiveWire({
              name: 'Write Back Bus (WB)',
              value: `MemToReg=${cpuState.activeSignals.memToReg ? 1 : 0} | RegWrite=${cpuState.activeSignals.regWrite ? 1 : 0}`,
              desc: 'Selects between ALU result and RAM data to write into the destination register.',
            })}
            style={{
              background: 'var(--surface-1)',
              border: '2px solid #ec4899',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 900, color: '#ec4899' }}>5. WRITEBACK (WB)</div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {cpuState.activeSignals.regWrite ? 'Register Write' : 'Idle'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Source: {cpuState.activeSignals.memToReg ? 'RAM' : 'ALU'}
            </div>
          </div>
        </div>

        {/* Wire Probe Inspector Banner */}
        {activeWire && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid var(--accent)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>
                Signal Probe: {activeWire.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {activeWire.desc}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {activeWire.value}
            </div>
          </div>
        )}
      </div>

      {/* ── STAGE PIPELINE ACTIVITY BREAKDOWN ─────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {(['IF', 'ID', 'EX', 'MEM', 'WB'] as const).map(st => (
          <div
            key={st}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>
              Stage {st}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {cpuState.stageDetails[st]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
