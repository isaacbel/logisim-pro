/**
 * 8086 ALU Laboratory
 * Step-by-step ALU operations with full flag computation and binary visualization.
 */
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { executeAlu8086, Alu8086Op } from '../engine/alu8086';

const FLAG_BITS_8086 = [
  { key: 'of', label: 'OF', bit: 11 },
  { key: 'df', label: 'DF', bit: 10 },
  { key: 'if', label: 'IF', bit: 9 },
  { key: 'tf', label: 'TF', bit: 8 },
  { key: 'sf', label: 'SF', bit: 7 },
  { key: 'zf', label: 'ZF', bit: 6 },
  { key: 'af', label: 'AF', bit: 4 },
  { key: 'pf', label: 'PF', bit: 2 },
  { key: 'cf', label: 'CF', bit: 0 },
];

function BinRow({ label, value, bits = 16, highlight = false }: { label: string; value: number; bits?: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', borderBottom: highlight ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
      <span style={{ width: 55, fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{label}:</span>
      <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: bits }, (_, i) => {
          const b = (value >> (bits - 1 - i)) & 1;
          return (
            <span key={i} style={{
              width: 15, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'monospace', fontSize: 11, fontWeight: b ? 900 : 400,
              color: b ? (highlight ? 'var(--accent)' : '#10b981') : 'var(--text-muted)',
              background: b ? (highlight ? 'rgba(59,130,246,0.18)' : 'rgba(16,185,129,0.12)') : 'transparent',
              borderRadius: 3,
            }}>
              {b}
            </span>
          );
        })}
      </div>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', marginLeft: 6 }}>
        0x{(value & (bits === 16 ? 0xFFFF : 0xFF)).toString(16).toUpperCase().padStart(bits / 4, '0')}
      </span>
    </div>
  );
}

const OPERATION_GROUPS: { label: string; ops: Alu8086Op[] }[] = [
  { label: 'Arithmetic', ops: ['ADD', 'ADC', 'SUB', 'SBB', 'INC', 'DEC', 'NEG', 'CMP', 'MUL', 'IMUL', 'DIV', 'IDIV'] },
  { label: 'Logic', ops: ['AND', 'OR', 'XOR', 'NOT', 'TEST'] },
  { label: 'Shift / Rotate', ops: ['SHL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR'] },
  { label: 'BCD', ops: ['DAA', 'DAS', 'CBW', 'CWD'] },
];

export function Alu8086Lab() {
  const [opA, setOpA] = useState('00FFH');
  const [opB, setOpB] = useState('0001H');
  const [cfIn, setCfIn] = useState(false);
  const [op, setOp] = useState<Alu8086Op>('ADD');
  const [is16, setIs16] = useState(true);
  const [history, setHistory] = useState<{ op: Alu8086Op; a: number; b: number; result: number; explanation: string }[]>([]);

  const parseHex = (s: string) => parseInt(s.replace(/H$/i, '').trim(), 16) || 0;

  const a = parseHex(opA);
  const b = parseHex(opB);

  const zeroFlags = { cf: cfIn, pf: false, af: false, zf: false, sf: false, tf: false, if: true, df: false, of: false };
  const aluResult = executeAlu8086(op, a, b, is16, zeroFlags);

  const execute = () => {
    setHistory(prev => [{ op, a, b, result: aluResult.result, explanation: aluResult.explanation }, ...prev.slice(0, 9)]);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 ALU Laboratory</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Step through ALU operations with full binary visualization and flag analysis.
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>Inputs</div>

          {/* Width toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[{ id: true, label: '16-bit' }, { id: false, label: '8-bit' }].map(w => (
              <button key={w.label} onClick={() => setIs16(w.id)} style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: is16 === w.id ? 'rgba(59,130,246,0.2)' : 'var(--surface-2)',
                border: `1px solid ${is16 === w.id ? 'var(--accent)' : 'var(--border)'}`,
                color: is16 === w.id ? 'var(--accent)' : 'var(--text-muted)',
              }}>{w.label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Operand A (hex)</div>
              <input value={opA} onChange={e => setOpA(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 14, fontWeight: 800 }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Operand B / Count (hex)</div>
              <input value={opB} onChange={e => setOpB(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 14, fontWeight: 800 }} />
            </div>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={cfIn} onChange={e => setCfIn(e.target.checked)} />
              Carry-In (CF) = 1
            </label>
          </div>

          {/* Operations */}
          <div style={{ marginTop: 12 }}>
            {OPERATION_GROUPS.map(grp => (
              <div key={grp.label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{grp.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {grp.ops.map(o => (
                    <button key={o} onClick={() => setOp(o)} style={{
                      padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'monospace',
                      background: op === o ? 'rgba(59,130,246,0.2)' : 'var(--surface-2)',
                      border: `1px solid ${op === o ? 'var(--accent)' : 'var(--border)'}`,
                      color: op === o ? 'var(--accent)' : 'var(--text-muted)',
                    }}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={execute} style={{
            marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--accent)',
            background: 'rgba(59,130,246,0.2)', color: 'var(--accent)', fontSize: 13, fontWeight: 900, cursor: 'pointer',
          }}>
            ▶ Execute {op}
          </button>
        </div>

        {/* Binary Visualization */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>Binary Computation</div>
          <div style={{ fontFamily: 'monospace' }}>
            <BinRow label="A" value={a} bits={is16 ? 16 : 8} />
            <BinRow label={`${op}  B`} value={b} bits={is16 ? 16 : 8} />
            {cfIn && <BinRow label="CF-IN" value={1} bits={is16 ? 16 : 8} />}
            <BinRow label="Result" value={aluResult.result} bits={is16 ? 16 : 8} highlight />
          </div>

          <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>EXPLANATION</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aluResult.explanation}</div>
          </div>

          {/* Flags */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6 }}>OUTPUT FLAGS</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FLAG_BITS_8086.map(f => {
                const flagVal = aluResult.flags[f.key as keyof typeof aluResult.flags] as boolean;
                return (
                  <div key={f.label} style={{
                    padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, fontWeight: 900,
                    background: flagVal ? 'rgba(59,130,246,0.2)' : 'var(--surface-2)',
                    border: `1px solid ${flagVal ? 'var(--accent)' : 'var(--border)'}`,
                    color: flagVal ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    {f.label}={flagVal ? '1' : '0'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 10 }}>Execution History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6, fontFamily: 'monospace', fontSize: 11 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 800, width: 40 }}>{h.op}</span>
                <span style={{ color: 'var(--text-muted)' }}>0x{h.a.toString(16).toUpperCase().padStart(4, '0')}</span>
                <span style={{ color: 'var(--text-muted)' }}>, 0x{h.b.toString(16).toUpperCase().padStart(4, '0')}</span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span style={{ color: '#10b981', fontWeight: 900 }}>0x{h.result.toString(16).toUpperCase().padStart(4, '0')}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{h.explanation.slice(0, 60)}…</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
