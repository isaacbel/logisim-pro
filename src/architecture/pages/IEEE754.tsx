// ─────────────────────────────────────────────────────────────────────────────
// IEEE754 — Floating-Point Encoding (Float32 & Float64) & Special Values
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import {
  decimalToIEEE754, ieee754ToDecimal
} from '../engine/ieee754';
import type { IEEEFormat } from '../engine/types';
import { StepViewer } from '../components/StepViewer';
import { ValueInspector } from '../components/ValueInspector';
import { Zap, Sparkles } from 'lucide-react';

const PRESETS = [
  { label: '1.0', val: '1.0' },
  { label: '-1.0', val: '-1.0' },
  { label: '3.14159', val: '3.14159' },
  { label: '0.1', val: '0.1' },
  { label: '+0', val: '0' },
  { label: '−0', val: '-0' },
  { label: '+Infinity', val: 'Infinity' },
  { label: '−Infinity', val: '-Infinity' },
  { label: 'NaN', val: 'NaN' },
];

export function IEEE754Page() {
  const [decInput, setDecInput] = useState<string>('3.14159');
  const [format, setFormat] = useState<IEEEFormat>('float32');

  const { sendBitsToCircuit } = useAppStore();

  const ieeeResult = useMemo(() => {
    return decimalToIEEE754(decInput, format);
  }, [decInput, format]);

  const decoded = useMemo(() => {
    return ieee754ToDecimal(
      ieeeResult.result.sign,
      ieeeResult.result.exponent,
      ieeeResult.result.mantissa,
      format
    );
  }, [ieeeResult, format]);

  const handleSendToCircuit = () => {
    const raw = `${ieeeResult.result.sign}${ieeeResult.result.exponent}${ieeeResult.result.mantissa}`;
    const clean = raw.replace(/[^01]/g, '') || '0';
    const bits = clean.split('').map(Number) as (0 | 1)[];
    sendBitsToCircuit(bits, `IEEE_${format.toUpperCase()}`);
  };

  const expBits = format === 'float32' ? 8 : 11;
  const mantBits = format === 'float32' ? 23 : 52;
  const bias = format === 'float32' ? 127 : 1023;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>
          IEEE 754 Floating-Point Standard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Encode decimal numbers into standard Single (32-bit) and Double (64-bit) precision binary formats. Understand normalized numbers, biases, and special values (+0, −0, ±∞, NaN).
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
              Decimal / Special Value
            </label>
            <input
              type="text"
              value={decInput}
              onChange={e => setDecInput(e.target.value)}
              placeholder="e.g. 3.14159, -0.05, Infinity, NaN..."
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

          {/* Precision Selector */}
          <div style={{ width: 200 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Precision Format
            </label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as IEEEFormat)}
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
              <option value="float32">Float32 Single (1 + 8 + 23 = 32b)</option>
              <option value="float64">Float64 Double (1 + 11 + 52 = 64b)</option>
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

        {/* Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
            <Sparkles size={11} /> Presets:
          </span>
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setDecInput(p.val)}
              style={{
                padding: '3px 8px',
                background: decInput === p.val ? 'var(--surface-hover)' : 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Color-Coded IEEE Bit Field Breakdown */}
        <div style={{
          background: 'var(--surface-1)',
          padding: '18px 16px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              IEEE 754 ({format === 'float32' ? '32-Bit Single' : '64-Bit Double'}) Bit Fields
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              Bias = {bias}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Sign Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                padding: '8px 14px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 700,
                color: '#ef4444',
                textAlign: 'center',
              }}>
                {ieeeResult.result.sign}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>Sign (1b)</span>
            </div>

            {/* Exponent Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
              <div style={{
                padding: '8px 14px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 700,
                color: '#3b82f6',
                letterSpacing: '0.05em',
                textAlign: 'center',
                wordBreak: 'break-all',
              }}>
                {ieeeResult.result.exponent}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                Biased Exponent ({expBits}b) = {parseInt(ieeeResult.result.exponent, 2)}
              </span>
            </div>

            {/* Mantissa Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2, minWidth: 200 }}>
              <div style={{
                padding: '8px 14px',
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                color: '#8b5cf6',
                letterSpacing: '0.05em',
                wordBreak: 'break-all',
              }}>
                {ieeeResult.result.mantissa}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                Fraction / Mantissa ({mantBits}b)
              </span>
            </div>
          </div>

          {/* Decoded Value Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 6,
            border: '1px solid var(--border)',
            marginTop: 4,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Decoded Value Formula:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>
              (−1)^{ieeeResult.result.sign} × 1.{ieeeResult.result.mantissa.slice(0, 8)}... × 2^{parseInt(ieeeResult.result.exponent, 2) - bias} = {String(decoded.result)}
            </span>
          </div>
        </div>
      </div>

      {/* Step by Step Breakdown */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          IEEE 754 Encoding Steps (Normalized Binary & Biased Exponent)
        </h2>
        <StepViewer
          steps={ieeeResult.steps}
          warnings={ieeeResult.warnings}
          errors={ieeeResult.errors}
        />
      </div>

      {/* Value Inspector */}
      <ValueInspector
        binary={`${ieeeResult.result.sign}${ieeeResult.result.exponent}${ieeeResult.result.mantissa}`}
        bits={1 + expBits + mantBits}
        label={`Raw IEEE-754 Bitstring (${1 + expBits + mantBits}-bit)`}
        showSendToCircuit={true}
      />
    </div>
  );
}
