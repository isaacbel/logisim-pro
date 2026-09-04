// ─────────────────────────────────────────────────────────────────────────────
// BinaryTable — Reference table (0-15) showing Binary, Hex, Octal, BCD, Excess-3
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';

export function BinaryTable() {
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);

  const rows = Array.from({ length: 16 }, (_, i) => {
    const bin = i.toString(2).padStart(4, '0');
    const oct = i.toString(8);
    const hex = i.toString(16).toUpperCase();
    const bcd = i <= 9 ? bin : '— (invalid)';
    const exc3 = i <= 9 ? (i + 3).toString(2).padStart(4, '0') : '—';
    const onesComp = i === 0 ? '0000 / 1111' : (15 - i).toString(2).padStart(4, '0');
    return { dec: i, bin, oct, hex, bcd, exc3, onesComp };
  });

  return (
    <div style={{
      background: 'var(--panel-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          4-Bit Reference Table (0–15)
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Hover row to inspect
        </span>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Dec</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Binary</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Hex</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Oct</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>BCD</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Excess-3</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isHl = highlightedRow === r.dec;
              return (
                <tr
                  key={r.dec}
                  onMouseEnter={() => setHighlightedRow(r.dec)}
                  onMouseLeave={() => setHighlightedRow(null)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isHl ? 'var(--surface-hover)' : 'transparent',
                    cursor: 'default',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '6px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.dec}</td>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: '#3b82f6', fontWeight: 600 }}>{r.bin}</td>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>{r.hex}</td>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{r.oct}</td>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: r.dec <= 9 ? '#10b981' : 'var(--text-muted)' }}>{r.bcd}</td>
                  <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', color: r.dec <= 9 ? '#f59e0b' : 'var(--text-muted)' }}>{r.exc3}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
