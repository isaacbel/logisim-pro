/**
 * 8086 Timing & Bus Waveform Laboratory
 * Digital waveforms for 8086 Read/Write cycles (CLK, ALE, A/D, RD, WR, READY, DEN, DT/R) with wait-state injection.
 */
import { useState } from 'react';
import { Waves, Plus, Minus } from 'lucide-react';

export function Timing8086Lab() {
  const [cycleType, setCycleType] = useState<'Read' | 'Write'>('Read');
  const [waitStates, setWaitStates] = useState<number>(0);
  const [clockFreqMHz, setClockFreqMHz] = useState<number>(5);

  const tStateList = ['T1', 'T2', ...Array.from({ length: waitStates }, (_, i) => `Tw${i + 1}`), 'T3', 'T4'];
  const clockPeriodNs = (1000 / clockFreqMHz).toFixed(1);
  const totalDurationNs = (tStateList.length * (1000 / clockFreqMHz)).toFixed(1);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Waves size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Bus Cycle Timing & Waveform Visualizer</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Inspect clock cycle waveforms (CLK, ALE, Multiplexed AD Bus, RD, WR, READY) and simulate slow memory wait states.
          </p>
        </div>
      </div>

      {/* Timing Controls */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>Bus Cycle:</span>
            {(['Read', 'Write'] as const).map(ct => (
              <button
                key={ct}
                onClick={() => setCycleType(ct)}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  background: cycleType === ct ? 'rgba(59,130,246,0.2)' : 'var(--surface-2)',
                  border: `1px solid ${cycleType === ct ? 'var(--accent)' : 'var(--border)'}`,
                  color: cycleType === ct ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {ct} Cycle
              </button>
            ))}

            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginLeft: 10 }}>Clock Frequency:</span>
            {([5, 8, 10] as const).map(freq => (
              <button
                key={freq}
                onClick={() => setClockFreqMHz(freq)}
                style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  background: clockFreqMHz === freq ? 'rgba(16,185,129,0.18)' : 'var(--surface-2)',
                  border: `1px solid ${clockFreqMHz === freq ? '#10b981' : 'var(--border)'}`,
                  color: clockFreqMHz === freq ? '#10b981' : 'var(--text-muted)',
                }}
              >
                {freq} MHz
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>Wait States (Tw):</span>
            <button
              onClick={() => setWaitStates(w => Math.max(0, w - 1))}
              style={{ padding: '4px 8px', borderRadius: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <Minus size={12} />
            </button>
            <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13, color: '#f59e0b', minWidth: 20, textAlign: 'center' }}>{waitStates}</span>
            <button
              onClick={() => setWaitStates(w => Math.min(4, w + 1))}
              style={{ padding: '4px 8px', borderRadius: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
          Clock Period: <strong>{clockPeriodNs} ns</strong> per T-state. Total Bus Cycle Duration: <strong>{totalDurationNs} ns</strong> ({tStateList.length} T-states).
        </div>
      </div>

      {/* Waveform Diagram Grid */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, overflowX: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>
          Timing Waveforms for 8086 {cycleType} Cycle
        </div>

        {/* T-state header row */}
        <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${tStateList.length}, 1fr)`, gap: 4, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>SIGNAL</div>
          {tStateList.map(t => (
            <div key={t} style={{
              textAlign: 'center', padding: '4px 0', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, fontWeight: 900,
              background: t.startsWith('Tw') ? 'rgba(245,158,11,0.18)' : 'rgba(59,130,246,0.12)',
              border: `1px solid ${t.startsWith('Tw') ? '#f59e0b' : 'var(--accent)'}`,
              color: t.startsWith('Tw') ? '#f59e0b' : 'var(--accent)',
            }}>
              {t}
            </div>
          ))}
        </div>

        {/* Waveform Signal Rows */}
        {[
          { name: 'CLK (Clock)', render: () => <div style={{ height: 16, borderTop: '2px solid #38bdf8', borderBottom: '2px solid #38bdf8', background: 'rgba(56,189,248,0.1)' }} /> },
          {
            name: 'ALE (Latch)',
            render: (t: string) => (
              <div style={{ height: 16, borderBottom: t === 'T1' ? '2px solid #10b981' : '1px solid var(--border)', background: t === 'T1' ? 'rgba(16,185,129,0.25)' : 'transparent', textAlign: 'center', fontSize: 9, color: '#10b981', fontWeight: 800 }}>
                {t === 'T1' ? 'HIGH' : 'LOW'}
              </div>
            ),
          },
          {
            name: 'AD0–AD15 Bus',
            render: (t: string) => (
              <div style={{
                height: 16, borderRadius: 2, textAlign: 'center', fontSize: 9, fontWeight: 900, fontFamily: 'monospace',
                background: t === 'T1' ? 'rgba(59,130,246,0.2)' : (t === 'T3' || t === 'T4') ? 'rgba(16,185,129,0.2)' : 'var(--surface-2)',
                color: t === 'T1' ? 'var(--accent)' : (t === 'T3' || t === 'T4') ? '#10b981' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}>
                {t === 'T1' ? 'ADDRESS' : (t === 'T3' || t === 'T4') ? 'DATA' : 'FLOAT'}
              </div>
            ),
          },
          {
            name: cycleType === 'Read' ? 'RD (Read Strobe)' : 'WR (Write Strobe)',
            render: (t: string) => {
              const active = t === 'T2' || t.startsWith('Tw') || t === 'T3';
              return (
                <div style={{
                  height: 16, textAlign: 'center', fontSize: 9, fontWeight: 800,
                  background: active ? 'rgba(239,68,68,0.15)' : 'transparent',
                  borderBottom: active ? '2px solid #ef4444' : '1px solid var(--border)',
                  color: active ? '#ef4444' : 'var(--text-muted)',
                }}>
                  {active ? 'ACTIVE LOW' : 'HIGH'}
                </div>
              );
            },
          },
          {
            name: 'READY Pin',
            render: (t: string) => {
              const isTw = t.startsWith('Tw');
              return (
                <div style={{
                  height: 16, textAlign: 'center', fontSize: 9, fontWeight: 800,
                  background: isTw ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.1)',
                  color: isTw ? '#f59e0b' : '#10b981',
                }}>
                  {isTw ? 'LOW (Not Ready)' : 'HIGH (Ready)'}
                </div>
              );
            },
          },
        ].map(sig => (
          <div key={sig.name} style={{ display: 'grid', gridTemplateColumns: `120px repeat(${tStateList.length}, 1fr)`, gap: 4, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>{sig.name}</div>
            {tStateList.map(t => (
              <div key={t}>{sig.render(t)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
