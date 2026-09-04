/**
 * 8086 Stack & Activation Frame Laboratory
 * Interactive stack memory visualization, SP/BP tracking, PUSH/POP/CALL/RET animations.
 */
import { useState } from 'react';
import { Layers, ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';

export function Stack8086Lab() {
  const [ss] = useState<number>(0x7000);
  const [sp, setSp] = useState<number>(0x0100);
  const [bp, setBp] = useState<number>(0x0100);
  const [stackMem, setStackMem] = useState<Record<number, number>>({
    0x00FE: 0x1234,
    0x00FC: 0x5678,
    0x00FA: 0x0105, // return IP
  });
  const [inputVal, setInputVal] = useState<string>('ABCD');
  const [log, setLog] = useState<string[]>(['Stack initialized at SS:SP = 7000:0100H']);

  const parseHex = (s: string) => parseInt(s.replace(/H$/i, '').trim(), 16) || 0;

  const pushVal = (val: number, label?: string) => {
    const newSp = (sp - 2) & 0xFFFF;
    setStackMem(prev => ({ ...prev, [newSp]: val & 0xFFFF }));
    setSp(newSp);
    const tag = label ? ` (${label})` : '';
    setLog(prev => [`PUSH 0x${val.toString(16).toUpperCase().padStart(4, '0')}${tag} → SS:[0x${newSp.toString(16).toUpperCase().padStart(4, '0')}] (SP decremented to 0x${newSp.toString(16).toUpperCase().padStart(4, '0')})`, ...prev.slice(0, 9)]);
  };

  const popVal = () => {
    const val = stackMem[sp] ?? 0;
    const newSp = (sp + 2) & 0xFFFF;
    setSp(newSp);
    setLog(prev => [`POP → 0x${val.toString(16).toUpperCase().padStart(4, '0')} from SS:[0x${sp.toString(16).toUpperCase().padStart(4, '0')}] (SP incremented to 0x${newSp.toString(16).toUpperCase().padStart(4, '0')})`, ...prev.slice(0, 9)]);
    return val;
  };

  const callProc = () => {
    pushVal(0x0245, 'Saved Return IP');
  };

  const retProc = () => {
    popVal();
  };

  const resetStack = () => {
    setSp(0x0100);
    setBp(0x0100);
    setStackMem({});
    setLog(['Stack reset to initial empty state.']);
  };

  // Stack offsets around SP to display
  const displayOffsets: number[] = [];
  for (let off = 0x0108; off >= 0x00F0; off -= 2) {
    displayOffsets.push(off);
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Stack & Procedure Frame Laboratory</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Analyze stack memory growth (top-down), SP/BP activation frames, and CALL/RET return address storage.
          </p>
        </div>
      </div>

      {/* Stack Controls */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>Hex Value:</span>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12, width: 80 }}
            />
            <button
              onClick={() => pushVal(parseHex(inputVal))}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 14px', borderRadius: 6,
                background: 'rgba(56,189,248,0.18)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <ArrowDown size={12} /> PUSH Word
            </button>
            <button
              onClick={popVal}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 14px', borderRadius: 6,
                background: 'rgba(16,185,129,0.18)', border: '1px solid #10b981', color: '#10b981', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <ArrowUp size={12} /> POP Word
            </button>
            <button
              onClick={callProc}
              style={{
                padding: '5px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.18)', border: '1px solid #f59e0b', color: '#f59e0b',
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              CALL Proc (Push IP)
            </button>
            <button
              onClick={retProc}
              style={{
                padding: '5px 12px', borderRadius: 6, background: 'rgba(203,166,247,0.18)', border: '1px solid #cba6f7', color: '#cba6f7',
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              RET (Pop IP)
            </button>
          </div>
          <button
            onClick={resetStack}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} /> Reset Stack
          </button>
        </div>
      </div>

      {/* Visual Stack Memory Column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 10 }}>
            Stack Segment Memory Map (SS: {ss.toString(16).toUpperCase()}H) — Grows Downwards (Higher to Lower Address)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {displayOffsets.map(off => {
              const isSp = off === sp;
              const isBp = off === bp;
              const hasData = stackMem[off] !== undefined;
              const val = stackMem[off] ?? 0;
              const physAddr = (ss * 16 + off) & 0xFFFFF;

              return (
                <div
                  key={off}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 100px 1fr 140px',
                    gap: 8,
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: isSp ? 'rgba(56,189,248,0.15)' : hasData ? 'var(--surface-2)' : 'transparent',
                    border: `1px solid ${isSp ? '#38bdf8' : hasData ? 'var(--border)' : 'rgba(255,255,255,0.05)'}`,
                    fontFamily: 'monospace',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>0x{off.toString(16).toUpperCase().padStart(4, '0')}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>PA: 0x{physAddr.toString(16).toUpperCase().padStart(5, '0')}</span>
                  <span style={{ fontWeight: 900, color: hasData ? '#10b981' : 'var(--text-muted)' }}>
                    {hasData ? `0x${val.toString(16).toUpperCase().padStart(4, '0')}` : '—'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {isSp && (
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#38bdf8', color: '#000', fontWeight: 900, fontSize: 10 }}>
                        ← SP (Top)
                      </span>
                    )}
                    {isBp && !isSp && (
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f59e0b', color: '#000', fontWeight: 900, fontSize: 10 }}>
                        ← BP (Base)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Info: Registers & Stack Operations Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Registers Card */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>STACK REGISTERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'monospace', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>SS (Stack Segment):</span>
                <span style={{ color: '#f59e0b', fontWeight: 900 }}>0x{ss.toString(16).toUpperCase().padStart(4, '0')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>SP (Stack Pointer):</span>
                <span style={{ color: '#38bdf8', fontWeight: 900 }}>0x{sp.toString(16).toUpperCase().padStart(4, '0')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>BP (Base Pointer):</span>
                <span style={{ color: '#cba6f7', fontWeight: 900 }}>0x{bp.toString(16).toUpperCase().padStart(4, '0')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
                <span style={{ color: 'var(--text-muted)' }}>Top Physical PA:</span>
                <span style={{ color: '#10b981', fontWeight: 900 }}>0x{((ss * 16 + sp) & 0xFFFFF).toString(16).toUpperCase().padStart(5, '0')}</span>
              </div>
            </div>
          </div>

          {/* Operations Log */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>OPERATION LOG</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10 }}>
              {log.map((entry, idx) => (
                <div key={idx} style={{ color: idx === 0 ? '#38bdf8' : 'var(--text-muted)', lineHeight: 1.5 }}>
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
