import { useState, useMemo } from 'react';
import { simulateRegisterFile } from '../engine/registerFileEngine';
import { Database, Zap, RefreshCw, Clock } from 'lucide-react';
import { useAppStore } from '@state/store';

export function RegisterFileLab() {
  const regCount = 8;
  const bitWidth = 8;
  const [registers, setRegisters] = useState<number[]>([10, 25, 0, 100, 42, 255, 0, 7]);
  const [readAddrA, setReadAddrA] = useState<number>(0);
  const [readAddrB, setReadAddrB] = useState<number>(1);
  const [writeAddr, setWriteAddr] = useState<number>(2);
  const [writeData, setWriteData] = useState<number>(35);
  const [writeEnable, setWriteEnable] = useState<boolean>(true);

  const { sendBitsToCircuit } = useAppStore();

  const simResult = useMemo(() => {
    return simulateRegisterFile(
      regCount,
      bitWidth,
      registers,
      readAddrA,
      readAddrB,
      writeAddr,
      writeData,
      writeEnable,
      false
    );
  }, [regCount, bitWidth, registers, readAddrA, readAddrB, writeAddr, writeData, writeEnable]);

  const handleClockPulse = () => {
    if (!writeEnable) return;
    const res = simulateRegisterFile(
      regCount,
      bitWidth,
      registers,
      readAddrA,
      readAddrB,
      writeAddr,
      writeData,
      true,
      true
    );
    setRegisters(res.registers.map(r => r.value));
  };

  const handleResetAll = () => {
    setRegisters(Array(regCount).fill(0));
  };

  const handleSendPortAToCanvas = () => {
    const bits = simResult.readValA.toString(2).padStart(bitWidth, '0').split('').map(b => (b === '1' ? 1 : 0) as 0 | 1).reverse();
    sendBitsToCircuit(bits, `Reg_R${readAddrA}`);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Database size={22} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Multi-Port Register File Laboratory
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Dual-port asynchronous read and synchronous rising-edge clock write architecture.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleResetAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} />
            <span>Clear All (0x00)</span>
          </button>

          <button
            onClick={handleSendPortAToCanvas}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(139,92,246,0.35)',
              background: 'rgba(139,92,246,0.12)',
              color: '#a78bfa',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Zap size={14} />
            <span>Inject Port A into Canvas</span>
          </button>
        </div>
      </div>

      {/* ── SETTINGS & CONTROLS ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {/* Read Ports Config */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>
            Read Ports (Asynchronous)
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Port A Address (RA):</span>
              <select
                value={readAddrA}
                onChange={e => setReadAddrA(parseInt(e.target.value))}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {Array.from({ length: regCount }, (_, i) => (
                  <option key={i} value={i}>R{i}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Port B Address (RB):</span>
              <select
                value={readAddrB}
                onChange={e => setReadAddrB(parseInt(e.target.value))}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {Array.from({ length: regCount }, (_, i) => (
                  <option key={i} value={i}>R{i}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Port Outputs Display */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            <div style={{ padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Port A Output:</div>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: '#38bdf8' }}>
                0x{simResult.readValA.toString(16).toUpperCase()} ({simResult.readValA})
              </div>
            </div>

            <div style={{ padding: 8, borderRadius: 6, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Port B Output:</div>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: '#a78bfa' }}>
                0x{simResult.readValB.toString(16).toUpperCase()} ({simResult.readValB})
              </div>
            </div>
          </div>
        </div>

        {/* Write Port Config */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b' }}>
              Write Port (Synchronous)
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: writeEnable ? '#10b981' : 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={writeEnable}
                onChange={e => setWriteEnable(e.target.checked)}
              />
              Write Enable (WE)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target Register (WA):</span>
              <select
                value={writeAddr}
                onChange={e => setWriteAddr(parseInt(e.target.value))}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {Array.from({ length: regCount }, (_, i) => (
                  <option key={i} value={i}>R{i}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Data (WD):</span>
              <input
                type="number"
                value={writeData}
                min={0}
                max={(1 << bitWidth) - 1}
                onChange={e => setWriteData(parseInt(e.target.value) || 0)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Clock Trigger Button */}
          <button
            onClick={handleClockPulse}
            disabled={!writeEnable}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${writeEnable ? '#f59e0b' : 'var(--border)'}`,
              background: writeEnable ? 'rgba(245,158,11,0.15)' : 'var(--surface-2)',
              color: writeEnable ? '#f59e0b' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 800,
              cursor: writeEnable ? 'pointer' : 'not-allowed',
              marginTop: 4,
            }}
          >
            <Clock size={14} />
            <span>Trigger Clock Pulse (CLK ↑)</span>
          </button>
        </div>
      </div>

      {/* ── REGISTER TABLE VIEW ───────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            Register Contents ({regCount} registers of {bitWidth} bits)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Live register states with signed and unsigned representations
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {simResult.registers.map(reg => {
            const isReadA = readAddrA === reg.index;
            const isReadB = readAddrB === reg.index;
            const isWrite = writeAddr === reg.index;

            return (
              <div
                key={reg.index}
                style={{
                  background: 'var(--surface-2)',
                  border: isWrite && writeEnable
                    ? '2px solid #f59e0b'
                    : isReadA && isReadB
                    ? '2px solid #a855f7'
                    : isReadA
                    ? '2px solid #38bdf8'
                    : isReadB
                    ? '2px solid #a78bfa'
                    : '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  position: 'relative',
                }}
              >
                {/* Register Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {reg.name}
                  </span>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {isReadA && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#38bdf8', color: '#000', fontWeight: 800 }}>RA</span>}
                    {isReadB && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#a78bfa', color: '#000', fontWeight: 800 }}>RB</span>}
                    {isWrite && writeEnable && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#f59e0b', color: '#000', fontWeight: 800 }}>WA</span>}
                  </div>
                </div>

                {/* Values Display */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: 'var(--accent)' }}>
                    {reg.hex}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {reg.value} ({reg.signedVal >= 0 ? `+${reg.signedVal}` : reg.signedVal})
                  </span>
                </div>

                {/* Binary representation */}
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 1 }}>
                  {reg.bin}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
