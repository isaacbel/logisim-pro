// ─────────────────────────────────────────────────────────────────────────────
// SignedNumbers — Sign-Magnitude, 1's Complement & 2's Complement
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import {
  toSignMagnitude, toOnesComplement, toTwosComplement,
  twosComplementAdd, twosComplementSubtract
} from '../engine/signed';
import { StepViewer } from '../components/StepViewer';
import { ValueInspector } from '../components/ValueInspector';
import { Zap } from 'lucide-react';

export function SignedNumbers() {
  const [decValue, setDecValue] = useState<string>('-42');
  const [bitWidth, setBitWidth] = useState<number>(8);
  const [activeTab, setActiveTab] = useState<'encode' | 'arithmetic'>('encode');

  // Arithmetic mode state
  const [arithA, setArithA] = useState<string>('15');
  const [arithB, setArithB] = useState<string>('-20');
  const [arithOp, setArithOp] = useState<'+' | '-'>('+');

  const { sendBitsToCircuit } = useAppStore();

  const numVal = parseInt(decValue, 10) || 0;

  const smResult = useMemo(() => toSignMagnitude(numVal, bitWidth), [numVal, bitWidth]);
  const onesResult = useMemo(() => toOnesComplement(numVal, bitWidth), [numVal, bitWidth]);
  const twosResult = useMemo(() => toTwosComplement(numVal, bitWidth), [numVal, bitWidth]);

  const arithResult = useMemo(() => {
    const a = parseInt(arithA, 10) || 0;
    const b = parseInt(arithB, 10) || 0;
    return arithOp === '+' ? twosComplementAdd(a, b, bitWidth) : twosComplementSubtract(a, b, bitWidth);
  }, [arithA, arithB, arithOp, bitWidth]);

  const handleSendToCircuit = (binStr: string) => {
    const clean = binStr.replace(/[^01]/g, '') || '0';
    const bits = clean.split('').map(Number) as (0 | 1)[];
    sendBitsToCircuit(bits, `Signed_${decValue}`);
  };

  // Ranges
  const maxPos = Math.pow(2, bitWidth - 1) - 1;
  const minNegSM = -(Math.pow(2, bitWidth - 1) - 1);
  const minNegTC = -Math.pow(2, bitWidth - 1);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          Signed Numbers & Two's Complement Representation
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Compare Sign-Magnitude, One's Complement, and Two's Complement encodings. Practice two's complement subtraction and overflow detection.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('encode')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${activeTab === 'encode' ? 'var(--accent)' : 'var(--border)'}`,
            background: activeTab === 'encode' ? 'rgba(59,130,246,0.12)' : 'var(--surface-1)',
            color: activeTab === 'encode' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Representation & Comparison
        </button>
        <button
          onClick={() => setActiveTab('arithmetic')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${activeTab === 'arithmetic' ? 'var(--accent)' : 'var(--border)'}`,
            background: activeTab === 'arithmetic' ? 'rgba(59,130,246,0.12)' : 'var(--surface-1)',
            color: activeTab === 'arithmetic' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Two's Complement Arithmetic (+ / −)
        </button>
      </div>

      {activeTab === 'encode' ? (
        <>
          {/* Config Box */}
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
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Signed Decimal Number
              </label>
              <input
                type="number"
                value={decValue}
                onChange={e => setDecValue(e.target.value)}
                placeholder="e.g. -42"
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

            <div style={{ width: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Bit Width
              </label>
              <select
                value={bitWidth}
                onChange={e => setBitWidth(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              >
                <option value={4}>4-Bit ([-8, 7])</option>
                <option value={8}>8-Bit ([-128, 127])</option>
                <option value={16}>16-Bit</option>
                <option value={32}>32-Bit</option>
                <option value={64}>64-Bit</option>
              </select>
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Sign Magnitude */}
            <div style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Sign-Magnitude</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Range: [{minNegSM}, +{maxPos}]</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                {smResult.result || 'Out of range'}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                MSB is sign (0=+, 1=−); remaining {bitWidth - 1} bits store positive magnitude. Dual zeros (+0, −0).
              </p>
            </div>

            {/* One's Complement */}
            <div style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase' }}>One's Complement</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Range: [{minNegSM}, +{maxPos}]</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                {onesResult.result || 'Out of range'}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Invert all bits for negative numbers. Dual zeros (00…0 and 11…1). Requires end-around carry.
              </p>
            </div>

            {/* Two's Complement */}
            <div style={{
              background: 'var(--panel-bg)',
              border: '2px solid var(--accent)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>Two's Complement</span>
                  <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4 }}>Standard</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Range: [{minNegTC}, +{maxPos}]</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>
                  {twosResult.result || 'Out of range'}
                </span>
                {twosResult.result && (
                  <button
                    onClick={() => handleSendToCircuit(twosResult.result)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(59,130,246,0.15)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Zap size={11} /> Send
                  </button>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Invert all bits + add 1. Only single zero representation. Hardware addition & subtraction are identical.
              </p>
            </div>
          </div>

          {/* Step-by-step for Two's Complement */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              Two's Complement Derivation Steps
            </h2>
            <StepViewer steps={twosResult.steps} warnings={twosResult.warnings} errors={twosResult.errors} />
          </div>
        </>
      ) : (
        <>
          {/* Two's Complement Arithmetic Config */}
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
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Operand A (Decimal)
              </label>
              <input
                type="number"
                value={arithA}
                onChange={e => setArithA(e.target.value)}
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

            <div style={{ width: 80 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Operation
              </label>
              <select
                value={arithOp}
                onChange={e => setArithOp(e.target.value as '+' | '-')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                <option value="+">+</option>
                <option value="-">−</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Operand B (Decimal)
              </label>
              <input
                type="number"
                value={arithB}
                onChange={e => setArithB(e.target.value)}
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

            <div style={{ width: 120 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Bit Width
              </label>
              <select
                value={bitWidth}
                onChange={e => setBitWidth(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              >
                <option value={4}>4-Bit</option>
                <option value={8}>8-Bit</option>
                <option value={16}>16-Bit</option>
                <option value={32}>32-Bit</option>
                <option value={64}>64-Bit</option>
              </select>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              Two's Complement Arithmetic Steps
            </h2>
            <StepViewer steps={arithResult.steps} warnings={arithResult.warnings} errors={arithResult.errors} />
          </div>
        </>
      )}

      {/* Value Inspector */}
      <ValueInspector
        binary={twosResult.result || '0'}
        bits={bitWidth}
        label={`Value Inspector for ${decValue} (${bitWidth}-bit)`}
        showSendToCircuit={true}
      />
    </div>
  );
}
