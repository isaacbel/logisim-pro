// ─────────────────────────────────────────────────────────────────────────────
// FixedPoint — Qm.n Fixed-Point Number Representation & Fractional Conversions
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import {
  decimalToFixedPoint, fixedPointToDecimal
} from '../engine/fixedPoint';
import { StepViewer } from '../components/StepViewer';
import { ValueInspector } from '../components/ValueInspector';
import { Zap, AlertCircle } from 'lucide-react';

export function FixedPoint() {
  const [decInput, setDecInput] = useState<string>('13.625');
  const [intBits, setIntBits] = useState<number>(8);
  const [fracBits, setFracBits] = useState<number>(8);

  const { sendBitsToCircuit } = useAppStore();

  const fpResult = useMemo(() => {
    return decimalToFixedPoint(decInput, intBits, fracBits);
  }, [decInput, intBits, fracBits]);

  const reconstructed = useMemo(() => {
    return fixedPointToDecimal(fpResult.result.intBinary, fpResult.result.fracBinary);
  }, [fpResult]);

  const handleSendToCircuit = () => {
    const raw = `${fpResult.result.intBinary}${fpResult.result.fracBinary}`;
    const clean = raw.replace(/[^01]/g, '') || '0';
    const bits = clean.split('').map(Number) as (0 | 1)[];
    sendBitsToCircuit(bits, `Fixed_Q${intBits}.${fracBits}`);
  };



  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          Fixed-Point Number Representation (Q{intBits}.{fracBits})
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Represent fractional numbers using fixed binary radix point alignment. Inspect repeated fractional multiplication by 2.
        </p>
      </div>

      {/* Configuration Card */}
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Decimal Input */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Decimal Value (e.g. 13.625, 0.1, 7.75)
            </label>
            <input
              type="text"
              value={decInput}
              onChange={e => setDecInput(e.target.value)}
              placeholder="e.g. 13.625"
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

          {/* Integer Bits */}
          <div style={{ width: 140 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Integer Bits (m)
            </label>
            <select
              value={intBits}
              onChange={e => setIntBits(Number(e.target.value))}
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
              <option value={4}>4 Bits (0–15)</option>
              <option value={8}>8 Bits (0–255)</option>
              <option value={16}>16 Bits (0–65535)</option>
            </select>
          </div>

          {/* Fractional Bits */}
          <div style={{ width: 140 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Fractional Bits (n)
            </label>
            <select
              value={fracBits}
              onChange={e => setFracBits(Number(e.target.value))}
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
              <option value={4}>4 Bits (1/16 = 0.0625)</option>
              <option value={8}>8 Bits (1/256 ≈ 0.0039)</option>
              <option value={12}>12 Bits (1/4096 ≈ 0.00024)</option>
              <option value={16}>16 Bits (1/65536)</option>
            </select>
          </div>

          <button
            onClick={handleSendToCircuit}
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

        {/* Binary Visualizer with Radix Point */}
        <div style={{
          background: 'var(--surface-1)',
          padding: '16px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Q{intBits}.{fracBits} Binary Alignment ({intBits + fracBits} Total Bits)
            </span>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Integer Part */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                padding: '8px 16px',
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 700,
                color: '#3b82f6',
                letterSpacing: '0.08em',
              }}>
                {fpResult.result.intBinary}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{intBits} Integer Bits</span>
            </div>

            {/* Radix Point */}
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#f59e0b',
              margin: '0 2px',
              userSelect: 'none',
            }}>
              .
            </div>

            {/* Fractional Part */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                padding: '8px 16px',
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '0.08em',
              }}>
                {fpResult.result.fracBinary}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fracBits} Fractional Bits</span>
            </div>

            {/* Reconstruction Badge */}
            <div style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Reconstructed Value:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {reconstructed.result.toFixed(6)}
              </span>
            </div>
          </div>

          {fpResult.result.truncated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '6px 12px', borderRadius: 4 }}>
              <AlertCircle size={14} />
              <span>Fractional part is repeating/truncated. Increase fractional bit width to reduce quantization error.</span>
            </div>
          )}
        </div>
      </div>

      {/* Step by Step Breakdown */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Fractional Conversion Steps (Repeated Multiplication by 2)
        </h2>
        <StepViewer
          steps={fpResult.steps}
          warnings={fpResult.warnings}
          errors={fpResult.errors}
        />
      </div>

      {/* Value Inspector */}
      <ValueInspector
        binary={`${fpResult.result.intBinary}${fpResult.result.fracBinary}`}
        bits={intBits + fracBits}
        label={`Raw Integer Interpretation (${intBits + fracBits}-bit total)`}
        showSendToCircuit={true}
      />
    </div>
  );
}
