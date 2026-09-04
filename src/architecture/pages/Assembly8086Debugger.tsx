/**
 * 8086 Assembly Debugger — Monaco-based editor + real 8086 emulator stepper
 */
import { useState, useRef } from 'react';
import { Terminal, Play, StepForward, RotateCcw, Pause } from 'lucide-react';
import { assemble8086 } from '../engine/assembler8086';
import { CPU8086State, createInitial8086State } from '../engine/cpu8086Types';
import { step8086 } from '../engine/cpu8086';

const STARTER = `; 8086 Assembly Debugger
; Use the toolbar to assemble, step, or run.
; ─────────────────────────────────────────────

    MOV AX, 0005H   ; AX = 5
    MOV BX, 0003H   ; BX = 3
    ADD AX, BX      ; AX = 8
    MOV CX, AX      ; CX = 8
    SHL AX, 1       ; AX = 16 (shift left = *2)
    CMP AX, CX      ; 16 vs 8 → ZF=0, SF=0
    JE  EQUAL       ; Won't jump (AX != CX)
    INC BX          ; BX = 4
EQUAL:
    MOV DX, 0001H
    HLT
`;

interface TraceEntry {
  ip: number;
  disasm: string;
  ax: number; bx: number; cx: number; dx: number;
  flags: { cf: boolean; zf: boolean; sf: boolean; of: boolean };
}

function regHex(v: number) { return `0x${v.toString(16).toUpperCase().padStart(4, '0')}`; }
function pa(seg: number, off: number) { return `0x${((seg * 16 + off) & 0xFFFFF).toString(16).toUpperCase().padStart(5, '0')}`; }

export function Assembly8086Debugger() {
  const [code, setCode] = useState(STARTER);
  const [cpu, setCpu] = useState<CPU8086State | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [machineCode, setMachineCode] = useState<string>('');
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assemble = () => {
    const result = assemble8086(code);
    if (!result.success) {
      setErrors(result.errors.map(e => `Line ${e.line}: ${e.message}`));
      setCpu(null);
      setTrace([]);
      setMachineCode('');
      return;
    }
    setErrors([]);
    const newCpu = createInitial8086State(result.machineCode);
    setCpu(newCpu);
    setTrace([]);
    setMachineCode(result.machineCode.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
  };

  const snapshot = (state: CPU8086State): TraceEntry => ({
    ip: state.registers.ip,
    disasm: state.currentDisassembly ?? '',
    ax: state.registers.ax, bx: state.registers.bx,
    cx: state.registers.cx, dx: state.registers.dx,
    flags: { cf: state.registers.flags.cf, zf: state.registers.flags.zf, sf: state.registers.flags.sf, of: state.registers.flags.of },
  });

  const stepOnce = () => {
    if (!cpu || cpu.halted) return;
    const snapshotBefore = snapshot(cpu);
    step8086(cpu);
    setCpu({ ...cpu });
    setTrace(prev => [...prev, snapshotBefore]);
  };

  const reset = () => {
    if (rafRef.current) clearTimeout(rafRef.current);
    setRunning(false);
    assemble();
  };

  const runAll = () => {
    if (!cpu) { assemble(); return; }
    setRunning(true);
    const run = (state: CPU8086State, snapshots: TraceEntry[], maxSteps = 5000) => {
      let i = 0;
      while (!state.halted && i < maxSteps) {
        const snap = snapshot(state);
        step8086(state);
        snapshots.push(snap);
        i++;
      }
      setCpu({ ...state });
      setTrace(snapshots);
      setRunning(false);
    };
    run(cpu, [...trace]);
  };

  const halt = cpu?.halted ?? false;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Assembly Debugger</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Write Intel syntax assembly → assemble → step or run with the real 8086 emulator.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { icon: <Play size={13} />, label: 'Assemble', action: assemble, color: '#10b981', disabled: false },
            { icon: <StepForward size={13} />, label: 'Step', action: stepOnce, color: 'var(--accent)', disabled: !cpu || halt },
            { icon: <Pause size={13} />, label: 'Run All', action: runAll, color: '#f59e0b', disabled: !cpu || halt || running },
            { icon: <RotateCcw size={13} />, label: 'Reset', action: reset, color: '#ef4444', disabled: false },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} disabled={btn.disabled} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: btn.disabled ? 'not-allowed' : 'pointer',
              background: btn.disabled ? 'var(--surface-2)' : `${btn.color}20`,
              border: `1px solid ${btn.disabled ? 'var(--border)' : btn.color}`,
              color: btn.disabled ? 'var(--text-muted)' : btn.color, opacity: btn.disabled ? 0.5 : 1,
            }}>
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14 }}>
        {/* Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%', minHeight: 340, padding: 14, borderRadius: 10, fontFamily: '"Fira Code", "Consolas", monospace',
              fontSize: 12, lineHeight: 1.7, background: '#0d1117', color: '#e6edf3',
              border: '1px solid var(--border)', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {/* Errors */}
          {errors.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', marginBottom: 6 }}>ASSEMBLY ERRORS</div>
              {errors.map((e, i) => <div key={i} style={{ fontFamily: 'monospace', fontSize: 11, color: '#ef4444' }}>{e}</div>)}
            </div>
          )}
          {/* Machine code */}
          {machineCode && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>MACHINE CODE (hex)</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#10b981', wordBreak: 'break-all', lineHeight: 1.7 }}>{machineCode}</div>
            </div>
          )}
        </div>

        {/* State Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Registers */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>REGISTERS</div>
            {cpu ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace', fontSize: 12 }}>
                {[
                  ['AX', cpu.registers.ax], ['BX', cpu.registers.bx],
                  ['CX', cpu.registers.cx], ['DX', cpu.registers.dx],
                  ['SP', cpu.registers.sp], ['BP', cpu.registers.bp],
                  ['SI', cpu.registers.si], ['DI', cpu.registers.di],
                  ['IP', cpu.registers.ip],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{k}:</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 900 }}>{regHex(v as number)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{v as number}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Press Assemble to initialize.</div>
            )}
          </div>

          {/* Flags */}
          {cpu && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>FLAGS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[
                  ['CF', cpu.registers.flags.cf],
                  ['PF', cpu.registers.flags.pf],
                  ['AF', cpu.registers.flags.af],
                  ['ZF', cpu.registers.flags.zf],
                  ['SF', cpu.registers.flags.sf],
                  ['IF', cpu.registers.flags.if],
                  ['DF', cpu.registers.flags.df],
                  ['OF', cpu.registers.flags.of],
                ].map(([k, v]) => (
                  <div key={k as string} style={{
                    padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, fontWeight: 800,
                    background: v ? 'rgba(59,130,246,0.2)' : 'var(--surface-2)',
                    border: `1px solid ${v ? 'var(--accent)' : 'var(--border)'}`,
                    color: v ? 'var(--accent)' : 'var(--text-muted)',
                  }}>{k}={v ? '1' : '0'}</div>
                ))}
              </div>
            </div>
          )}

          {/* Segment map */}
          {cpu && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', marginBottom: 6 }}>PHYSICAL ADDRESS MAP</div>
              {[
                ['CS:IP', cpu.registers.cs, cpu.registers.ip, 'Code'],
                ['SS:SP', cpu.registers.ss, cpu.registers.sp, 'Stack'],
                ['DS:0000', cpu.registers.ds, 0, 'Data Base'],
              ].map(([lbl, seg, off, role]) => (
                <div key={lbl as string} style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  <span style={{ color: '#f59e0b' }}>{lbl}</span> = {pa(seg as number, off as number)} ({role})
                </div>
              ))}
              {halt && <div style={{ marginTop: 6, fontSize: 10, fontWeight: 900, color: '#10b981' }}>● HALTED</div>}
            </div>
          )}
        </div>
      </div>

      {/* Trace log */}
      {trace.length > 0 && (
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>EXECUTION TRACE ({trace.length} steps)</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {['#', 'IP', 'Instruction', 'AX', 'BX', 'CX', 'DX', 'CF', 'ZF', 'SF', 'OF'].map(h => (
                    <th key={h} style={{ padding: '2px 8px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trace.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', backgroundColor: i % 2 ? 'var(--surface-2)' : 'transparent' }}>
                    <td style={{ padding: '2px 8px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '2px 8px', color: '#f59e0b' }}>{regHex(t.ip)}</td>
                    <td style={{ padding: '2px 8px', color: 'var(--accent)', fontWeight: 700 }}>{t.disasm}</td>
                    <td style={{ padding: '2px 8px' }}>{regHex(t.ax)}</td>
                    <td style={{ padding: '2px 8px' }}>{regHex(t.bx)}</td>
                    <td style={{ padding: '2px 8px' }}>{regHex(t.cx)}</td>
                    <td style={{ padding: '2px 8px' }}>{regHex(t.dx)}</td>
                    <td style={{ padding: '2px 8px', color: t.flags.cf ? 'var(--accent)' : 'var(--text-muted)' }}>{t.flags.cf ? '1' : '0'}</td>
                    <td style={{ padding: '2px 8px', color: t.flags.zf ? 'var(--accent)' : 'var(--text-muted)' }}>{t.flags.zf ? '1' : '0'}</td>
                    <td style={{ padding: '2px 8px', color: t.flags.sf ? '#ef4444' : 'var(--text-muted)' }}>{t.flags.sf ? '1' : '0'}</td>
                    <td style={{ padding: '2px 8px', color: t.flags.of ? '#f59e0b' : 'var(--text-muted)' }}>{t.flags.of ? '1' : '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
