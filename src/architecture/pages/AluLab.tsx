import { useState, useMemo } from 'react';
import { computeALU, ALU_OPERATIONS, AluResult } from '../engine/aluEngine';
import { Cpu, Zap, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@state/store';

export function AluLab() {
  const [opcode, setOpcode] = useState<number>(0);
  const [valA, setValA] = useState<number>(18);
  const [valB, setValB] = useState<number>(7);
  const [bitWidth, setBitWidth] = useState<number>(8);

  const { sendBitsToCircuit } = useAppStore();

  const aluResult: AluResult = useMemo(() => {
    return computeALU(opcode, valA, valB, bitWidth);
  }, [opcode, valA, valB, bitWidth]);

  const mask = bitWidth === 32 ? 0xFFFFFFFF : (1 << bitWidth) - 1;

  const handleSendResultToCanvas = () => {
    sendBitsToCircuit(aluResult.resultBits, `ALU_${aluResult.operationName}`);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Cpu size={22} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Arithmetic Logic Unit (ALU) Pro Lab
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Full-featured hardware ALU simulator driven by Logisim Pro. Arithmetic, logical operations, and status flag assertions.
          </p>
        </div>

        <button
          onClick={handleSendResultToCanvas}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(139,92,246,0.35)',
            background: 'rgba(139,92,246,0.12)',
            color: '#a78bfa',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Zap size={14} />
          <span>Inject Result into Canvas</span>
        </button>
      </div>

      {/* ── CONTROLS & SETTINGS ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {/* Bit Width Selector */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Bus Width (Bits):</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[4, 8, 16, 32].map(w => (
              <button
                key={w}
                onClick={() => setBitWidth(w)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 6,
                  border: `1px solid ${bitWidth === w ? 'var(--accent)' : 'var(--border)'}`,
                  background: bitWidth === w ? 'var(--accent)' : 'var(--surface-2)',
                  color: bitWidth === w ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {w} bits
              </button>
            ))}
          </div>
        </div>

        {/* Input A Controller */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>Operand A:</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              0x{(valA & mask).toString(16).toUpperCase()}
            </span>
          </div>
          <input
            type="number"
            value={valA}
            min={0}
            max={mask}
            onChange={e => setValA(Math.max(0, Math.min(mask, parseInt(e.target.value) || 0)))}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 700,
            }}
          />
        </div>

        {/* Input B Controller */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>Operand B:</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              0x{(valB & mask).toString(16).toUpperCase()}
            </span>
          </div>
          <input
            type="number"
            value={valB}
            min={0}
            max={mask}
            onChange={e => setValB(Math.max(0, Math.min(mask, parseInt(e.target.value) || 0)))}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 700,
            }}
          />
        </div>
      </div>

      {/* ── OPERATION SELECTOR (8 ALU OPS) ────────────────────────────────── */}
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
          ALU Operation Selection (3-bit Control Code):
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
          {ALU_OPERATIONS.map(op => {
            const isSelected = opcode === op.opcode;
            return (
              <button
                key={op.opcode}
                onClick={() => setOpcode(op.opcode)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'rgba(59,130,246,0.15)' : 'var(--surface-2)',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.7 }}>
                  Code {op.opcode.toString(2).padStart(3, '0')}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{op.mnemonic}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{op.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ALU VISUAL DIAGRAM & RESULTS ──────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 20,
      }}>
        {/* Left: Result Details & Bit Visualizer */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
            Computation Result
          </div>

          {/* Primary Result Big Banner */}
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Decimal Value (Unsigned / Signed):</div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'monospace', color: '#10b981', marginTop: 2 }}>
                {aluResult.result} <span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 600 }}>/ {
                  aluResult.result >= (1 << (bitWidth - 1))
                    ? aluResult.result - (1 << bitWidth)
                    : aluResult.result
                }</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hexadecimal:</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: 'var(--accent)' }}>
                0x{aluResult.result.toString(16).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Bit vector representation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Result Bit Vector ({bitWidth} bits, MSB on the left):
            </div>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
              {[...aluResult.resultBits].reverse().map((bit, idx) => {
                const bitIndex = bitWidth - 1 - idx;
                return (
                  <div
                    key={bitIndex}
                    style={{
                      flex: 1,
                      minWidth: 28,
                      height: 44,
                      borderRadius: 6,
                      border: `1px solid ${bit === 1 ? '#10b981' : 'var(--border)'}`,
                      background: bit === 1 ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: bit === 1 ? '#10b981' : 'var(--text-muted)' }}>
                      {bit}
                    </span>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                      b{bitIndex}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation Text */}
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}>
            {aluResult.explanation}
          </div>
        </div>

        {/* Right: Status Flags Register */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
              Status Register (Flags)
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Zero Flag */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 8,
              background: aluResult.flags.zero ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
              border: `1px solid ${aluResult.flags.zero ? '#10b981' : 'var(--border)'}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: aluResult.flags.zero ? '#10b981' : 'var(--text-primary)' }}>
                  Z (Zero Flag)
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Asserted when result is zero</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: aluResult.flags.zero ? '#10b981' : 'var(--text-muted)' }}>
                {aluResult.flags.zero ? '1' : '0'}
              </span>
            </div>

            {/* Negative Flag */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 8,
              background: aluResult.flags.negative ? 'rgba(239,68,68,0.15)' : 'var(--surface-2)',
              border: `1px solid ${aluResult.flags.negative ? '#ef4444' : 'var(--border)'}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: aluResult.flags.negative ? '#ef4444' : 'var(--text-primary)' }}>
                  N (Negative Flag)
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Asserted when sign bit (MSB) is 1</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: aluResult.flags.negative ? '#ef4444' : 'var(--text-muted)' }}>
                {aluResult.flags.negative ? '1' : '0'}
              </span>
            </div>

            {/* Carry Flag */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 8,
              background: aluResult.flags.carry ? 'rgba(245,158,11,0.15)' : 'var(--surface-2)',
              border: `1px solid ${aluResult.flags.carry ? '#f59e0b' : 'var(--border)'}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: aluResult.flags.carry ? '#f59e0b' : 'var(--text-primary)' }}>
                  C (Carry / Borrow)
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Unsigned overflow / borrow</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: aluResult.flags.carry ? '#f59e0b' : 'var(--text-muted)' }}>
                {aluResult.flags.carry ? '1' : '0'}
              </span>
            </div>

            {/* Overflow Flag */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 8,
              background: aluResult.flags.overflow ? 'rgba(236,72,153,0.15)' : 'var(--surface-2)',
              border: `1px solid ${aluResult.flags.overflow ? '#ec4899' : 'var(--border)'}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: aluResult.flags.overflow ? '#ec4899' : 'var(--text-primary)' }}>
                  V (Signed Overflow)
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>2's complement arithmetic overflow</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: aluResult.flags.overflow ? '#ec4899' : 'var(--text-muted)' }}>
                {aluResult.flags.overflow ? '1' : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
