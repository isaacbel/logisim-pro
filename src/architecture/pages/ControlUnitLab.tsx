import { useState, useMemo } from 'react';
import { INSTRUCTION_SET, decodeInstruction, InstructionDef } from '../engine/controlUnitEngine';
import { Sliders } from 'lucide-react';

export function ControlUnitLab() {
  const [selectedOpcode, setSelectedOpcode] = useState<number>(1); // Default ADD

  const currentInstruction: InstructionDef = useMemo(() => {
    return decodeInstruction(selectedOpcode);
  }, [selectedOpcode]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sliders size={22} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Control Unit & Micro-Architectural Decoding Matrix
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Generates hardware control lines driving the datapath, memory buses, ALU operation codes, and multiplexers.
        </p>
      </div>

      {/* ── INSTRUCTION SELECTOR GRID ────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
          Instruction Set Architecture (16 4-bit Opcodes):
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
          {INSTRUCTION_SET.map(inst => {
            const isSelected = selectedOpcode === inst.opcode;
            const typeColor = inst.type === 'R' ? '#38bdf8' : inst.type === 'I' ? '#f59e0b' : '#ec4899';

            return (
              <button
                key={inst.opcode}
                onClick={() => setSelectedOpcode(inst.opcode)}
                style={{
                  padding: '8px',
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'rgba(59,130,246,0.18)' : 'var(--surface-2)',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 9 }}>
                  <span style={{ fontFamily: 'monospace', opacity: 0.6 }}>0x{inst.opcode.toString(16).toUpperCase()}</span>
                  <span style={{ fontWeight: 800, color: typeColor }}>Type {inst.type}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900 }}>{inst.mnemonic}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE DECODED SIGNALS MATRIX ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
      }}>
        {/* Left: Instruction Details */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
              Selected Instruction
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', fontWeight: 800 }}>
              Opcode: {currentInstruction.opcode.toString(2).padStart(4, '0')} (0x{currentInstruction.opcode.toString(16).toUpperCase()})
            </span>
          </div>

          <div style={{
            background: 'var(--surface-2)',
            borderRadius: 8,
            padding: 12,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: 'var(--accent)' }}>
              {currentInstruction.syntax}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {currentInstruction.description}
            </div>
          </div>

          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            fontSize: 12,
            color: 'var(--text-primary)',
            lineHeight: 1.5,
          }}>
            <strong>Micro-Architectural Behavior:</strong><br />
            {currentInstruction.signals.description}
          </div>
        </div>

        {/* Right: Decoded Control Lines Status */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
            Active Hardware Control Signals
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { name: 'RegWrite', active: currentInstruction.signals.regWrite, desc: 'Register Write Enable' },
              { name: 'ALUSrc', active: currentInstruction.signals.aluSrc, desc: '1=Immediate, 0=RegB' },
              { name: 'MemRead', active: currentInstruction.signals.memRead, desc: 'Data Memory Read' },
              { name: 'MemWrite', active: currentInstruction.signals.memWrite, desc: 'Data Memory Write' },
              { name: 'MemToReg', active: currentInstruction.signals.memToReg, desc: '1=RAM Data, 0=ALU' },
              { name: 'Branch', active: currentInstruction.signals.branch, desc: currentInstruction.signals.branchCondition },
              { name: 'Jump', active: currentInstruction.signals.jump, desc: 'Unconditional Jump' },
              { name: 'Halt', active: currentInstruction.signals.halt, desc: 'Processor Stop' },
            ].map(sig => (
              <div
                key={sig.name}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: sig.active ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                  border: `1px solid ${sig.active ? '#10b981' : 'var(--border)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: sig.active ? '#10b981' : 'var(--text-primary)' }}>
                    {sig.name}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{sig.desc}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: sig.active ? '#10b981' : 'var(--text-muted)' }}>
                  {sig.active ? '1' : '0'}
                </span>
              </div>
            ))}
          </div>

          {/* ALUOp Special Display */}
          <div style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'rgba(56,189,248,0.1)',
            border: '1px solid rgba(56,189,248,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>
                ALUOp (3-bit ALU Operation Code)
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Selects arithmetic or logic unit function
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: '#38bdf8' }}>
                {currentInstruction.signals.aluOpName} ({currentInstruction.signals.aluOp.toString(2).padStart(3, '0')})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FULL CONTROL MATRIX TABLE ─────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflowX: 'auto',
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
          Complete Decoding Truth Table (Combinational Control Logic)
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Opcode</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Mnemonic</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Type</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>RegWrite</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>ALUSrc</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>ALUOp</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>MemRead</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>MemWrite</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>MemToReg</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Branch</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Jump</th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Halt</th>
            </tr>
          </thead>
          <tbody>
            {INSTRUCTION_SET.map(inst => {
              const isSel = inst.opcode === selectedOpcode;
              return (
                <tr
                  key={inst.opcode}
                  onClick={() => setSelectedOpcode(inst.opcode)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isSel ? 'rgba(59,130,246,0.15)' : 'transparent',
                    cursor: 'pointer',
                    fontWeight: isSel ? 800 : 500,
                  }}
                >
                  <td style={{ padding: '6px 8px' }}>{inst.opcode.toString(2).padStart(4, '0')}</td>
                  <td style={{ padding: '6px 8px', color: isSel ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 800 }}>{inst.mnemonic}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>{inst.type}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.regWrite ? '#10b981' : 'var(--text-muted)' }}>{inst.signals.regWrite ? '1' : '0'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.aluSrc ? '#f59e0b' : 'var(--text-muted)' }}>{inst.signals.aluSrc ? '1' : '0'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>{inst.signals.aluOpName}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.memRead ? '#38bdf8' : 'var(--text-muted)' }}>{inst.signals.memRead ? '1' : '0'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.memWrite ? '#ec4899' : 'var(--text-muted)' }}>{inst.signals.memWrite ? '1' : '0'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.memToReg ? '#38bdf8' : 'var(--text-muted)' }}>{inst.signals.memToReg ? '1' : '0'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.branch ? '#f59e0b' : 'var(--text-muted)' }}>{inst.signals.branch ? '1' : '0'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.jump ? '#ec4899' : 'var(--text-muted)' }}>{inst.signals.jump ? '1' : '0'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: inst.signals.halt ? '#ef4444' : 'var(--text-muted)' }}>{inst.signals.halt ? '1' : '0'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
