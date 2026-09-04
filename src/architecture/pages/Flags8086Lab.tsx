/**
 * 8086 FLAGS Laboratory
 * Full 9-flag visualization with interactive previous→new diff tracking.
 */
import { useState } from 'react';
import { Flag } from 'lucide-react';
import { executeAlu8086, Alu8086Op } from '../engine/alu8086';

const FLAG_INFO: Record<string, { bit: number; name: string; when1: string; when0: string; instructions: string }> = {
  CF: { bit: 0, name: 'Carry Flag', when1: 'Result produced a carry-out of the MSB (unsigned overflow, or borrow for subtraction).', when0: 'No carry or borrow occurred.', instructions: 'ADD, ADC, SUB, SBB, SHL, SHR, ROL, ROR, RCL, RCR, CLC, STC, CMC, NEG' },
  PF: { bit: 2, name: 'Parity Flag', when1: 'Low 8 bits of result contain an even number of 1 bits.', when0: 'Low 8 bits contain an odd number of 1 bits.', instructions: 'ADD, SUB, AND, OR, XOR, INC, DEC, CMP, TEST' },
  AF: { bit: 4, name: 'Auxiliary Carry Flag', when1: 'Carry occurred from bit 3 to bit 4 (low nibble overflow). Used in BCD arithmetic.', when0: 'No nibble boundary carry.', instructions: 'ADD, ADC, SUB, SBB, INC, DEC, NEG, DAA, DAS, AAA, AAS' },
  ZF: { bit: 6, name: 'Zero Flag', when1: 'Result is exactly zero.', when0: 'Result is non-zero.', instructions: 'ADD, SUB, AND, OR, XOR, INC, DEC, NEG, CMP, TEST, LOOP, SCASB' },
  SF: { bit: 7, name: 'Sign Flag', when1: 'MSB of result is 1 (result is negative in 2\'s complement).', when0: 'MSB is 0 (result is positive or zero in 2\'s complement).', instructions: 'ADD, SUB, AND, OR, XOR, INC, DEC, NEG, CMP, TEST, SHL, SHR, SAR' },
  TF: { bit: 8, name: 'Trap Flag', when1: 'Single-step mode: CPU generates a debug INT 1 after each instruction.', when0: 'Normal execution mode.', instructions: 'PUSHF / POPF (set/clear indirectly)' },
  IF: { bit: 9, name: 'Interrupt Enable Flag', when1: 'Hardware interrupt requests (INTR) are recognized and processed.', when0: 'Hardware interrupts are masked (ignored until IF is set again).', instructions: 'STI (set), CLI (clear), IRET (restores saved IF)' },
  DF: { bit: 10, name: 'Direction Flag', when1: 'String operations auto-decrement SI/DI (process string from high to low addresses).', when0: 'String operations auto-increment SI/DI (process string from low to high addresses).', instructions: 'STD (set), CLD (clear)' },
  OF: { bit: 11, name: 'Overflow Flag', when1: 'Signed arithmetic overflow: result exceeded the range of the signed destination.', when0: 'No signed overflow occurred.', instructions: 'ADD, ADC, SUB, SBB, NEG, INC, DEC, IMUL, SHL, SAR, CMP' },
};

const FLAG_KEYS = ['CF', 'PF', 'AF', 'ZF', 'SF', 'TF', 'IF', 'DF', 'OF'];

export function Flags8086Lab() {
  const [opA, setOpA] = useState('00FFH');
  const [opB, setOpB] = useState('0001H');
  const [operation, setOperation] = useState<Alu8086Op>('ADD');
  const [is16Bit, setIs16Bit] = useState(true);
  const [prevFlags, setPrevFlags] = useState<Record<string, number>>({});
  const [currentFlags, setCurrentFlags] = useState<Record<string, number>>({});
  const [explanation, setExplanation] = useState<string>('');
  const [result, setResult] = useState<number | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);

  const parseHex = (s: string) => parseInt(s.trim().replace(/H$/i, ''), 16) || 0;

  const runOperation = () => {
    const a = parseHex(opA);
    const b = parseHex(opB);

    const zeroFlags = { cf: false, pf: false, af: false, zf: false, sf: false, tf: false, if: true, df: false, of: false };
    const aluResult = executeAlu8086(operation, a, b, is16Bit, zeroFlags);

    const flagWordBefore: Record<string, number> = {};
    FLAG_KEYS.forEach(k => { flagWordBefore[k] = 0; });
    flagWordBefore['IF'] = 1;

    const flagWordAfter: Record<string, number> = {};
    FLAG_KEYS.forEach(k => {
      const info = FLAG_INFO[k];
      if (!info) { flagWordAfter[k] = 0; return; }
      const f = aluResult.flags;
      switch (k) {
        case 'CF': flagWordAfter[k] = f.cf ? 1 : 0; break;
        case 'PF': flagWordAfter[k] = f.pf ? 1 : 0; break;
        case 'AF': flagWordAfter[k] = f.af ? 1 : 0; break;
        case 'ZF': flagWordAfter[k] = f.zf ? 1 : 0; break;
        case 'SF': flagWordAfter[k] = f.sf ? 1 : 0; break;
        case 'TF': flagWordAfter[k] = f.tf ? 1 : 0; break;
        case 'IF': flagWordAfter[k] = f.if ? 1 : 0; break;
        case 'DF': flagWordAfter[k] = f.df ? 1 : 0; break;
        case 'OF': flagWordAfter[k] = f.of ? 1 : 0; break;
        default: flagWordAfter[k] = 0;
      }
    });

    setPrevFlags(flagWordBefore);
    setCurrentFlags(flagWordAfter);
    setExplanation(aluResult.explanation);
    setResult(aluResult.result);
  };

  const ALU_OPS: Alu8086Op[] = ['ADD', 'ADC', 'SUB', 'SBB', 'INC', 'DEC', 'NEG', 'CMP', 'AND', 'OR', 'XOR', 'NOT', 'TEST', 'SHL', 'SHR', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR'];

  const selInfo = selectedFlag ? FLAG_INFO[selectedFlag] : null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Flag size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 FLAGS Register Laboratory</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Execute operations to observe flag transitions. Click any flag for detailed documentation.</p>
        </div>
      </div>

      {/* Operation Input Panel */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>ALU Operation Simulator</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Operand A (hex)</div>
            <input
              value={opA} onChange={e => setOpA(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13, width: 110 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Operation</div>
            <select
              value={operation} onChange={e => setOperation(e.target.value as Alu8086Op)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace' }}
            >
              {ALU_OPS.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Operand B (hex)</div>
            <input
              value={opB} onChange={e => setOpB(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13, width: 110 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={is16Bit} onChange={e => setIs16Bit(e.target.checked)} style={{ marginRight: 4 }} />
              16-bit
            </label>
          </div>
          <button
            onClick={runOperation}
            style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--accent)', background: 'rgba(59,130,246,0.18)', color: 'var(--accent)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
          >
            Execute
          </button>
          {result !== null && (
            <div style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', fontFamily: 'monospace', fontSize: 13, fontWeight: 900, color: '#10b981' }}>
              Result: 0x{result.toString(16).toUpperCase().padStart(is16Bit ? 4 : 2, '0')}
            </div>
          )}
        </div>
        {explanation && (
          <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {explanation}
          </div>
        )}
      </div>

      {/* Flags Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {FLAG_KEYS.map(fk => {
          const info = FLAG_INFO[fk];
          const prev = prevFlags[fk] ?? 0;
          const curr = currentFlags[fk] ?? (fk === 'IF' ? 1 : 0);
          const changed = Object.keys(currentFlags).length > 0 && prev !== curr;
          const isActive = curr === 1;

          return (
            <div
              key={fk}
              onClick={() => setSelectedFlag(sel => sel === fk ? null : fk)}
              style={{
                background: 'var(--surface-1)', border: `2px solid ${selectedFlag === fk ? 'var(--accent)' : isActive ? '#10b981' : 'var(--border)'}`,
                borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: isActive ? '#10b981' : 'var(--text-muted)' }}>{fk}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Object.keys(currentFlags).length > 0 && (
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: changed ? '#f59e0b' : 'var(--text-muted)' }}>
                      {prev} → {curr}
                    </span>
                  )}
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: 16, fontWeight: 900, background: isActive ? 'rgba(16,185,129,0.2)' : 'var(--surface-2)',
                    border: `2px solid ${isActive ? '#10b981' : 'var(--border)'}`, color: isActive ? '#10b981' : 'var(--text-muted)',
                  }}>
                    {curr}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{info.name}</div>
              {changed && (
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>Changed by {operation}!</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flag Documentation Panel */}
      {selInfo && (
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--accent)', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', marginBottom: 10 }}>{selectedFlag} — {selInfo.name} (Bit {selInfo.bit})</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 10, background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid #10b981' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#10b981', marginBottom: 4 }}>WHEN = 1</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selInfo.when1}</div>
            </div>
            <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid #ef4444' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', marginBottom: 4 }}>WHEN = 0</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selInfo.when0}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>INSTRUCTIONS THAT AFFECT THIS FLAG</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{selInfo.instructions}</div>
        </div>
      )}
    </div>
  );
}
