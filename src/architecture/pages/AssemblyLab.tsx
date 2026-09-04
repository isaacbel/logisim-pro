import { useState, useMemo, useEffect, useRef } from 'react';
import { assembleProgram, SAMPLE_PROGRAMS, AssemblyResult } from '../engine/assembler';
import { CpuState, createInitialCpuState, stepCpu } from '../engine/cpuEngine';
import { Terminal, Play, Pause, StepForward, RotateCcw, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';

export function AssemblyLab() {
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_PROGRAMS[0].code);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const speedMs = 300;

  const assemblyResult: AssemblyResult = useMemo(() => {
    return assembleProgram(sourceCode);
  }, [sourceCode]);

  const [cpuState, setCpuState] = useState<CpuState>(() => createInitialCpuState(assemblyResult.machineCode));

  const timerRef = useRef<number | null>(null);

  const handleStep = () => {
    if (cpuState.halted) return;
    setCpuState(prev => stepCpu(prev, assemblyResult.machineCode));
  };

  const handleReset = () => {
    setIsRunning(false);
    setCpuState(createInitialCpuState(assemblyResult.machineCode));
  };

  useEffect(() => {
    if (isRunning && !cpuState.halted) {
      timerRef.current = window.setTimeout(() => {
        setCpuState(prev => {
          const next = stepCpu(prev, assemblyResult.machineCode);
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
  }, [isRunning, cpuState, speedMs, assemblyResult.machineCode]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Terminal size={22} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              16-bit Assembly Workshop & CPU Debugger
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Write, assemble, and debug machine code in real time on the Logisim Pro virtual processor.
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
            <span>Step</span>
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

      {/* ── PROGRAM TEMPLATES PICKER ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Examples:</span>
        {SAMPLE_PROGRAMS.map((prog, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSourceCode(prog.code);
              const res = assembleProgram(prog.code);
              setCpuState(createInitialCpuState(res.machineCode));
              setIsRunning(false);
            }}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {prog.name}
          </button>
        ))}
      </div>

      {/* ── MAIN WORKSPACE: CODE EDITOR (LEFT) + CPU INSPECTOR (RIGHT) ────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
      }}>
        {/* Left: Assembly Source Editor */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCode size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                Assembly Source Code (.asm)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {assemblyResult.success ? (
                <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                  <CheckCircle2 size={13} /> {assemblyResult.machineCode.length} Words Assembled
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                  <AlertCircle size={13} /> {assemblyResult.errors.length} Error(s)
                </span>
              )}
            </div>
          </div>

          <textarea
            value={sourceCode}
            onChange={e => setSourceCode(e.target.value)}
            spellCheck={false}
            rows={18}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />

          {/* Machine Code Listing Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
              Binary Listing & Machine Code (ROM):
            </div>
            <div style={{
              maxHeight: 160,
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--surface-2)',
              fontSize: 11,
              fontFamily: 'monospace',
            }}>
              {assemblyResult.listing.map(line => {
                const isCurrentPC = cpuState.pc === line.address && !line.isLabelOnly;
                return (
                  <div
                    key={line.lineNumber}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 65px 1fr',
                      padding: '3px 8px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isCurrentPC ? 'rgba(59,130,246,0.25)' : 'transparent',
                      color: isCurrentPC ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: isCurrentPC ? 800 : 500,
                    }}
                  >
                    <span>{line.isLabelOnly ? '' : `@${line.address.toString().padStart(2, '0')}`}</span>
                    <span style={{ color: line.isLabelOnly ? 'transparent' : '#38bdf8' }}>{line.hex}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.sourceLine}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Live CPU State & Memory */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            Live CPU State
          </div>

          {/* PC, IR, Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <div style={{ padding: 8, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Program Counter (PC):</div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: 'var(--accent)' }}>
                {cpuState.pc} (0x{cpuState.pc.toString(16).toUpperCase()})
              </div>
            </div>

            <div style={{ padding: 8, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Instruction Register (IR):</div>
              <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: '#38bdf8' }}>
                0x{cpuState.ir.toString(16).toUpperCase().padStart(4, '0')}
              </div>
            </div>

            <div style={{ padding: 8, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Cycles / Instructions:</div>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: '#10b981' }}>
                {cpuState.cycleCount} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>cyc</span>
              </div>
            </div>
          </div>

          {/* Registers Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
              Registers R0..R7:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {cpuState.registers.map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    fontFamily: 'monospace',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>R{idx}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                    0x{val.toString(16).toUpperCase()} ({val})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Flags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
              Status Flags:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { name: 'Z (Zero)', val: cpuState.flags.zero },
                { name: 'N (Negative)', val: cpuState.flags.negative },
                { name: 'C (Carry)', val: cpuState.flags.carry },
                { name: 'V (Overflow)', val: cpuState.flags.overflow },
              ].map(f => (
                <div
                  key={f.name}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: 6,
                    background: f.val ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                    border: `1px solid ${f.val ? '#10b981' : 'var(--border)'}`,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    fontWeight: 800,
                    color: f.val ? '#10b981' : 'var(--text-muted)',
                  }}
                >
                  {f.name}: {f.val ? '1' : '0'}
                </div>
              ))}
            </div>
          </div>

          {/* RAM First 16 Bytes Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
              RAM Memory (Addresses 0x00..0x0F):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, fontFamily: 'monospace', fontSize: 10 }}>
              {cpuState.ram.slice(0, 16).map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 4,
                    borderRadius: 4,
                    background: val > 0 ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)',
                    border: `1px solid ${val > 0 ? '#10b981' : 'var(--border)'}`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>[{idx}]</div>
                  <div style={{ fontWeight: 800, color: val > 0 ? '#10b981' : 'var(--text-primary)' }}>
                    {val.toString(16).toUpperCase().padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
