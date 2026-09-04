// ─────────────────────────────────────────────────────────────────────────────
// BitDisplay — Interactive bit visualizer component
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';

interface BitDisplayProps {
  value: string;            // binary string e.g. "11010110"
  width?: number;           // override bit count (pads/truncates)
  onBitToggle?: (index: number, newBit: 0 | 1) => void;
  highlightPositions?: number[];
  highlightColor?: string;
  groupSize?: number;       // e.g. 4 for hex groups, 3 for octal
  showPositions?: boolean;
  label?: string;
  readOnly?: boolean;
}

export function BitDisplay({
  value,
  width,
  onBitToggle,
  highlightPositions = [],
  highlightColor = '#f59e0b',
  groupSize = 4,
  showPositions = true,
  label,
  readOnly = false,
}: BitDisplayProps) {
  const bits = useMemo(() => {
    const raw = value.replace(/[^01]/g, '') || '0';
    const w = width ?? raw.length;
    return raw.padStart(w, '0').slice(-w).split('');
  }, [value, width]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const len = bits.length;

  function handleClick(i: number) {
    if (readOnly || !onBitToggle) return;
    const newBit = bits[i] === '1' ? 0 : 1;
    onBitToggle(i, newBit as 0 | 1);
  }

  const copyBits = () => { void navigator.clipboard.writeText(bits.join('')); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, userSelect: 'none' }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
          {label}
        </div>
      )}

      {/* Bit cells */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {bits.map((bit, i) => {
          const isHighlighted = highlightPositions.includes(i);
          const isHigh = bit === '1';
          const isHovered = hoveredIdx === i;
          const isGroupBoundary = groupSize > 0 && i > 0 && (len - i) % groupSize === 0;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginLeft: isGroupBoundary ? 8 : 0,
              }}
            >
              <div
                onClick={() => handleClick(i)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                title={readOnly ? `Bit ${len - 1 - i}` : `Click to toggle bit ${len - 1 - i}`}
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${isHighlighted ? highlightColor : isHovered && !readOnly ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 4,
                  background: isHighlighted
                    ? `${highlightColor}22`
                    : isHigh
                      ? 'rgba(16,185,129,0.12)'
                      : 'var(--surface-2)',
                  color: isHigh ? '#10b981' : 'var(--text-muted)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: readOnly ? 'default' : 'pointer',
                  transition: 'all 0.1s',
                  boxShadow: isHigh ? '0 0 6px rgba(16,185,129,0.3)' : 'none',
                }}
              >
                {bit}
              </div>
              {showPositions && (
                <div style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                  lineHeight: 1,
                }}>
                  {len - 1 - i}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Copy button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        <button
          onClick={copyBits}
          style={{
            fontSize: 10,
            padding: '2px 8px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Copy
        </button>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {len} bits · dec {parseInt(bits.join('') || '0', 2)} · 0x{parseInt(bits.join('') || '0', 2).toString(16).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
