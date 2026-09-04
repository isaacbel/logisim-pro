// ─────────────────────────────────────────────────────────────────────────────
// ValueInspector — Universal value display in all bases + interpretations
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { useAppStore } from '@state/store';

interface ValueInspectorProps {
  binary: string;   // raw binary string, any length
  bits?: number;    // if given, constrains interpretation
  label?: string;
  showSendToCircuit?: boolean;
}

interface Row {
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
  copyable?: boolean;
}

function copyText(s: string) { void navigator.clipboard.writeText(s); }

function InspectorRow({ label, value, mono, accent, copyable }: Row) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 12px',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, minWidth: 120 }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontWeight: 600,
        color: accent ?? 'var(--text-primary)',
        letterSpacing: mono ? '0.08em' : 0,
        wordBreak: 'break-all',
        textAlign: 'right',
        maxWidth: 260,
      }}>
        {value}
      </span>
      {copyable && (
        <button
          onClick={() => copyText(value)}
          title="Copy"
          style={{
            marginLeft: 8,
            padding: '2px 6px',
            fontSize: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Copy
        </button>
      )}
    </div>
  );
}

export function ValueInspector({ binary, bits, label = 'Value Inspector', showSendToCircuit = false }: ValueInspectorProps) {
  const sendBitsToCircuit = useAppStore(s => s.sendBitsToCircuit);

  const rows = useMemo((): Row[] => {
    const raw = binary.replace(/[^01]/g, '') || '0';
    const w = bits ?? raw.length;
    const padded = raw.padStart(w, '0').slice(-w);
    const dec = parseInt(padded, 2);

    // Signed interpretations
    const signBit = parseInt(padded[0] ?? '0');

    // Two's complement signed
    let signedTC: number;
    if (signBit === 1 && w > 1) {
      const inv = padded.split('').map(b => b === '0' ? '1' : '0').join('');
      let carry = 1;
      const magBits = inv.split('').map(Number);
      for (let i = magBits.length - 1; i >= 0 && carry > 0; i--) {
        const s = magBits[i] + carry;
        magBits[i] = s % 2;
        carry = Math.floor(s / 2);
      }
      signedTC = -parseInt(magBits.join(''), 2);
    } else {
      signedTC = dec;
    }

    // Sign-magnitude
    const smMag = parseInt(padded.slice(1) || '0', 2);
    const signedSM = signBit === 1 ? -smMag : smMag;

    return [
      { label: 'Binary', value: padded, mono: true, accent: '#3b82f6', copyable: true },
      { label: 'Decimal (unsigned)', value: dec.toString(), mono: true, copyable: true },
      { label: 'Hex', value: dec.toString(16).toUpperCase(), mono: true, accent: '#8b5cf6', copyable: true },
      { label: 'Octal', value: dec.toString(8), mono: true, copyable: true },
      { label: 'Signed (Two\'s Comp.)', value: signedTC.toString(), mono: true, accent: '#10b981', copyable: true },
      { label: 'Signed (Sign-Magnitude)', value: signedSM.toString(), mono: true, copyable: true },
      { label: 'Two\'s Complement bits', value: padded, mono: true, copyable: false },
      { label: 'Bit width', value: `${w} bits` },
    ];
  }, [binary, bits]);

  const cleanBits = binary.replace(/[^01]/g, '') || '0';

  return (
    <div style={{
      background: 'var(--panel-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          {label}
        </span>
        {showSendToCircuit && cleanBits.length > 0 && (
          <button
            onClick={() => {
              const bits = cleanBits.split('').map(Number) as (0 | 1)[];
              sendBitsToCircuit(bits, 'Value');
            }}
            title="Send these bits to the Circuit Simulator"
            style={{
              fontSize: 11,
              padding: '4px 10px',
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: 5,
              color: '#a78bfa',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ⚡ Send to Circuit
          </button>
        )}
      </div>

      {/* Rows */}
      <div>
        {rows.map(row => <InspectorRow key={row.label} {...row} />)}
      </div>
    </div>
  );
}
