// ─────────────────────────────────────────────────────────────────────────────
// SpecialCodes — BCD (8421), BCD Addition (+6 Correction) & Excess-3
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import {
  decimalToBCD, bcdAdd, decimalToExcess3
} from '../engine/codes';
import { StepViewer } from '../components/StepViewer';
import { ValueInspector } from '../components/ValueInspector';
import { Zap, Plus, Hash } from 'lucide-react';

export function SpecialCodes() {
  const [activeCode, setActiveCode] = useState<'bcd' | 'bcd-add' | 'excess3'>('bcd');

  // Inputs
  const [decInput, setDecInput] = useState<string>('59');
  const [bcdAddA, setBcdAddA] = useState<string>('38');
  const [bcdAddB, setBcdAddB] = useState<string>('45');
  const [exc3Input, setExc3Input] = useState<string>('72');

  const { sendBitsToCircuit } = useAppStore();

  const bcdResult = useMemo(() => decimalToBCD(decInput), [decInput]);
  const bcdAddResult = useMemo(() => bcdAdd(bcdAddA, bcdAddB), [bcdAddA, bcdAddB]);
  const exc3Result = useMemo(() => decimalToExcess3(exc3Input), [exc3Input]);

  const handleSendToCircuit = (binStr: string, label: string) => {
    const clean = binStr.replace(/[^01]/g, '') || '0';
    const bits = clean.split('').map(Number) as (0 | 1)[];
    sendBitsToCircuit(bits, label);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          Special Digital Encodings: BCD & Excess-3
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Study Binary Coded Decimal (8421), hardware BCD addition with +6 correction rules, and Excess-3 self-complementing code.
        </p>
      </div>

      {/* Code Selection Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveCode('bcd')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${activeCode === 'bcd' ? 'var(--accent)' : 'var(--border)'}`,
            background: activeCode === 'bcd' ? 'rgba(59,130,246,0.12)' : 'var(--surface-1)',
            color: activeCode === 'bcd' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Hash size={14} /> BCD (8421 Code)
        </button>

        <button
          onClick={() => setActiveCode('bcd-add')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${activeCode === 'bcd-add' ? 'var(--accent)' : 'var(--border)'}`,
            background: activeCode === 'bcd-add' ? 'rgba(59,130,246,0.12)' : 'var(--surface-1)',
            color: activeCode === 'bcd-add' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Plus size={14} /> BCD Addition (+6 Correction)
        </button>

        <button
          onClick={() => setActiveCode('excess3')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${activeCode === 'excess3' ? 'var(--accent)' : 'var(--border)'}`,
            background: activeCode === 'excess3' ? 'rgba(59,130,246,0.12)' : 'var(--surface-1)',
            color: activeCode === 'excess3' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Hash size={14} /> Excess-3 (Self-Complementing)
        </button>
      </div>

      {/* Mode 1: BCD Encoding */}
      {activeCode === 'bcd' && (
        <>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            gap: 16,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Decimal Number
              </label>
              <input
                type="number"
                value={decInput}
                onChange={e => setDecInput(e.target.value)}
                placeholder="e.g. 59"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => handleSendToCircuit(bcdResult.result.fullBCD, `BCD_${decInput}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 6,
                color: '#60a5fa',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                height: 38,
              }}
            >
              <Zap size={14} /> Send to Circuit
            </button>
          </div>

          {/* BCD Digits Breakdown */}
          <div style={{
            background: 'var(--surface-1)',
            padding: '18px 16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              4-Bit BCD Digit Breakdown
            </span>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {bcdResult.result.digits.map((d: number, i: number) => (
                <div key={i} style={{
                  padding: '10px 16px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{d}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                    {bcdResult.result.bcdGroups[i]}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Digit {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              BCD Conversion Steps
            </h2>
            <StepViewer steps={bcdResult.steps} warnings={bcdResult.warnings} errors={bcdResult.errors} />
          </div>
        </>
      )}

      {/* Mode 2: BCD Addition */}
      {activeCode === 'bcd-add' && (
        <>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            gap: 16,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Operand A (Decimal)
              </label>
              <input
                type="number"
                value={bcdAddA}
                onChange={e => setBcdAddA(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Operand B (Decimal)
              </label>
              <input
                type="number"
                value={bcdAddB}
                onChange={e => setBcdAddB(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => handleSendToCircuit(bcdAddResult.result.finalBCD, `BCD_Sum_${bcdAddResult.result.decimalResult}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 6,
                color: '#60a5fa',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                height: 38,
              }}
            >
              <Zap size={14} /> Send to Circuit
            </button>
          </div>

          <div style={{
            background: 'var(--surface-1)',
            padding: '16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              BCD Addition Result: {bcdAddA} + {bcdAddB} = {bcdAddResult.result.decimalResult}
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#10b981' }}>
              Final BCD: {bcdAddResult.result.finalBCD}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Note: Whenever raw sum of two 4-bit nibbles exceeds 9 (or produces a carry), a +6 (0110₂) correction is automatically added to advance to the next decade.
            </span>
          </div>

          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              BCD Addition & Correction Steps
            </h2>
            <StepViewer steps={bcdAddResult.steps} warnings={bcdAddResult.warnings} errors={bcdAddResult.errors} />
          </div>
        </>
      )}

      {/* Mode 3: Excess-3 */}
      {activeCode === 'excess3' && (
        <>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            gap: 16,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Decimal Number
              </label>
              <input
                type="number"
                value={exc3Input}
                onChange={e => setExc3Input(e.target.value)}
                placeholder="e.g. 72"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={() => handleSendToCircuit(exc3Result.result.fullExcess3, `Excess3_${exc3Input}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 6,
                color: '#60a5fa',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                height: 38,
              }}
            >
              <Zap size={14} /> Send to Circuit
            </button>
          </div>

          <div style={{
            background: 'var(--surface-1)',
            padding: '18px 16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Excess-3 (Digit + 3) Representation
            </span>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {exc3Result.result.digits.map((d: number, i: number) => (
                <div key={i} style={{
                  padding: '10px 16px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {d} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+ 3 = {d + 3}</span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>
                    {exc3Result.result.excess3Groups[i]}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Digit {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              Excess-3 Conversion Steps
            </h2>
            <StepViewer steps={exc3Result.steps} warnings={exc3Result.warnings} errors={exc3Result.errors} />
          </div>
        </>
      )}

      {/* Value Inspector */}
      <ValueInspector
        binary={
          activeCode === 'bcd' ? bcdResult.result.fullBCD.replace(/\s+/g, '') :
            activeCode === 'bcd-add' ? bcdAddResult.result.finalBCD.replace(/\s+/g, '') :
              exc3Result.result.fullExcess3.replace(/\s+/g, '')
        }
        showSendToCircuit={true}
      />
    </div>
  );
}
