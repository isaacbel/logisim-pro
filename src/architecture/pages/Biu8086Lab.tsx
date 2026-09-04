/**
 * 8086 Bus Interface Unit (BIU) & Pinout Laboratory
 * 6-Byte Prefetch Queue simulation, Bus Cycles (T1–T4 + Tw), and 40-Pin DIP Pinout.
 */
import { useState } from 'react';
import { Layers } from 'lucide-react';

interface PinDefinition {
  pin: number;
  name: string;
  type: 'Input' | 'Output' | 'Bidirectional' | 'Power';
  description: string;
  minMaxMode?: 'Min' | 'Max' | 'Both';
}

const PINS_8086: PinDefinition[] = [
  { pin: 1, name: 'GND', type: 'Power', description: 'Ground connection (0V).' },
  { pin: 2, name: 'AD14', type: 'Bidirectional', description: 'Multiplexed Address (A14) / Data (D14) line.' },
  { pin: 3, name: 'AD13', type: 'Bidirectional', description: 'Multiplexed Address (A13) / Data (D13) line.' },
  { pin: 4, name: 'AD12', type: 'Bidirectional', description: 'Multiplexed Address (A12) / Data (D12) line.' },
  { pin: 5, name: 'AD11', type: 'Bidirectional', description: 'Multiplexed Address (A11) / Data (D11) line.' },
  { pin: 6, name: 'AD10', type: 'Bidirectional', description: 'Multiplexed Address (A10) / Data (D10) line.' },
  { pin: 7, name: 'AD9', type: 'Bidirectional', description: 'Multiplexed Address (A9) / Data (D9) line.' },
  { pin: 8, name: 'AD8', type: 'Bidirectional', description: 'Multiplexed Address (A8) / Data (D8) line.' },
  { pin: 9, name: 'AD7', type: 'Bidirectional', description: 'Multiplexed Address (A7) / Data (D7) line.' },
  { pin: 10, name: 'AD6', type: 'Bidirectional', description: 'Multiplexed Address (A6) / Data (D6) line.' },
  { pin: 11, name: 'AD5', type: 'Bidirectional', description: 'Multiplexed Address (A5) / Data (D5) line.' },
  { pin: 12, name: 'AD4', type: 'Bidirectional', description: 'Multiplexed Address (A4) / Data (D4) line.' },
  { pin: 13, name: 'AD3', type: 'Bidirectional', description: 'Multiplexed Address (A3) / Data (D3) line.' },
  { pin: 14, name: 'AD2', type: 'Bidirectional', description: 'Multiplexed Address (A2) / Data (D2) line.' },
  { pin: 15, name: 'AD1', type: 'Bidirectional', description: 'Multiplexed Address (A1) / Data (D1) line.' },
  { pin: 16, name: 'AD0', type: 'Bidirectional', description: 'Multiplexed Address (A0) / Data (D0) line. LSB.' },
  { pin: 17, name: 'NMI', type: 'Input', description: 'Non-Maskable Interrupt (Type 2, edge-triggered, highest priority).' },
  { pin: 18, name: 'INTR', type: 'Input', description: 'Maskable Interrupt Request (level-triggered, enabled if IF=1).' },
  { pin: 19, name: 'CLK', type: 'Input', description: 'System Clock input (typically 5 MHz, 33% duty cycle from 8284).' },
  { pin: 20, name: 'GND', type: 'Power', description: 'Ground connection (0V).' },
  { pin: 21, name: 'RESET', type: 'Input', description: 'System Reset. Clears registers, sets CS=0xFFFF, IP=0x0000.' },
  { pin: 22, name: 'READY', type: 'Input', description: 'Memory/IO Ready. If LOW during T3, CPU inserts wait states (Tw).' },
  { pin: 23, name: 'TEST', type: 'Input', description: 'Tested by WAIT instruction. Used for 8087 FPU synchronization.' },
  { pin: 24, name: 'INTA / QS1', type: 'Output', description: 'Interrupt Acknowledge (Min mode) or Queue Status 1 (Max mode).' },
  { pin: 25, name: 'ALE / QS0', type: 'Output', description: 'Address Latch Enable (Min mode) or Queue Status 0 (Max mode).' },
  { pin: 26, name: 'DEN / S0', type: 'Output', description: 'Data Enable for 8286 transceiver (Min) or Status S0 (Max).' },
  { pin: 27, name: 'DT/R / S1', type: 'Output', description: 'Data Transmit/Receive direction (Min) or Status S1 (Max).' },
  { pin: 28, name: 'M/IO / S2', type: 'Output', description: 'Memory / IO select (Min mode) or Status S2 (Max mode).' },
  { pin: 29, name: 'WR / LOCK', type: 'Output', description: 'Write strobe (Min mode) or Bus Lock signal (Max mode).' },
  { pin: 30, name: 'HLDA / RQ/GT1', type: 'Bidirectional', description: 'Hold Acknowledge (Min mode) or Request/Grant 1 (Max mode).' },
  { pin: 31, name: 'HOLD / RQ/GT0', type: 'Bidirectional', description: 'Hold Request for DMA (Min mode) or Request/Grant 0 (Max mode).' },
  { pin: 32, name: 'RD', type: 'Output', description: 'Read strobe (Active LOW when reading memory or I/O).' },
  { pin: 33, name: 'MN/MX', type: 'Input', description: 'Minimum Mode (VCC) / Maximum Mode (GND) select pin.' },
  { pin: 34, name: 'BHE / S7', type: 'Output', description: 'Bus High Enable. Active LOW to enable high data bus byte (D8–D15).' },
  { pin: 35, name: 'A19 / S6', type: 'Output', description: 'Address bit 19 / Status bit 6.' },
  { pin: 36, name: 'A18 / S5', type: 'Output', description: 'Address bit 18 / Status bit 5 (Interrupt Enable status).' },
  { pin: 37, name: 'A17 / S4', type: 'Output', description: 'Address bit 17 / Status bit 4 (Segment register identifier).' },
  { pin: 38, name: 'A16 / S3', type: 'Output', description: 'Address bit 16 / Status bit 3 (Segment register identifier).' },
  { pin: 39, name: 'AD15', type: 'Bidirectional', description: 'Multiplexed Address (A15) / Data (D15) line. MSB.' },
  { pin: 40, name: 'VCC', type: 'Power', description: 'Power supply (+5V DC ± 10%).' },
];

export function Biu8086Lab() {
  const [queue, setQueue] = useState<number[]>([0xB8, 0x34, 0x12, 0x01, 0xD8, 0x90]);
  const [ip, setIp] = useState<number>(0x0100);
  const [cs] = useState<number>(0x0700);
  const [selectedPin, setSelectedPin] = useState<PinDefinition | null>(null);
  const [activeCycleState, setActiveCycleState] = useState<string>('T1');

  // Queue operations
  const fetchByteIntoQueue = () => {
    if (queue.length >= 6) return;
    const nextByte = Math.floor(Math.random() * 256);
    setQueue(prev => [...prev, nextByte]);
    setIp(prev => (prev + 1) & 0xFFFF);
  };

  const consumeByteByEU = () => {
    if (queue.length === 0) return;
    setQueue(prev => prev.slice(1));
  };

  const flushQueue = () => {
    setQueue([]);
    setIp(0x0200); // Simulated branch target
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Layers size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 BIU, Prefetch Queue & Pinout</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Simulate the 6-byte instruction prefetch queue, analyze bus cycle states (T1–T4), and explore the 40-pin DIP layout.
          </p>
        </div>
      </div>

      {/* 6-Byte Prefetch Queue Simulation */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
            6-Byte Instruction Prefetch Queue (FIFO)
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={fetchByteIntoQueue}
              disabled={queue.length >= 6}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: queue.length >= 6 ? 'not-allowed' : 'pointer',
                background: 'rgba(56,189,248,0.18)', border: '1px solid #38bdf8', color: '#38bdf8', opacity: queue.length >= 6 ? 0.5 : 1,
              }}
            >
              + BIU Fetch Next Byte
            </button>
            <button
              onClick={consumeByteByEU}
              disabled={queue.length === 0}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: queue.length === 0 ? 'not-allowed' : 'pointer',
                background: 'rgba(203,166,247,0.18)', border: '1px solid #cba6f7', color: '#cba6f7', opacity: queue.length === 0 ? 0.5 : 1,
              }}
            >
              - EU Consume Byte
            </button>
            <button
              onClick={flushQueue}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                background: 'rgba(239,68,68,0.18)', border: '1px solid #ef4444', color: '#ef4444',
              }}
            >
              Flush Queue (Branch)
            </button>
          </div>
        </div>

        {/* Visual Queue Slots */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', width: 60, textAlign: 'right' }}>EU READ →</div>
          {Array.from({ length: 6 }).map((_, i) => {
            const byteVal = queue[i];
            const hasByte = byteVal !== undefined;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 60,
                  borderRadius: 8,
                  border: `2px solid ${hasByte ? '#38bdf8' : 'var(--border)'}`,
                  background: hasByte ? 'rgba(56,189,248,0.12)' : 'var(--surface-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>Q{i}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 900, color: hasByte ? '#38bdf8' : 'var(--text-muted)' }}>
                  {hasByte ? `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')}` : 'EMPTY'}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', width: 60 }}>← BIU WRITE</div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Current Fetch Pointer: CS:IP = <strong>0x{cs.toString(16).toUpperCase().padStart(4, '0')}:0x{ip.toString(16).toUpperCase().padStart(4, '0')}</strong> → Physical Address: <strong>0x{((cs * 16 + ip) & 0xFFFFF).toString(16).toUpperCase().padStart(5, '0')}</strong>.
          Queue fullness: <strong>{queue.length}/6 bytes</strong> ({queue.length >= 2 ? 'BIU idle or fetching' : 'BIU fetching with high priority'}).
        </div>
      </div>

      {/* Bus Cycle Waveform States (T1–T4) */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>
          8086 Bus Cycle Timing States (Read / Write Cycle)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { id: 'T1', name: 'T1: Address Latch', desc: 'Address A0–A19 outputted; ALE pulsed HIGH to latch address into 8282.' },
            { id: 'T2', name: 'T2: Bus Turnaround', desc: 'AD lines float for Read (DT/R=0); RD or WR signal goes active LOW.' },
            { id: 'Tw', name: 'Tw: Wait State (optional)', desc: 'Sample READY pin; if LOW, insert wait states until memory responds.' },
            { id: 'T3', name: 'T3: Data Transfer', desc: 'Data is placed on D0–D15 bus; READY sampled HIGH by 8284 clock gen.' },
            { id: 'T4', name: 'T4: Latch & Complete', desc: 'Data is latched into CPU internal buffer; RD/WR deactivated; DEN=1.' },
          ].map(c => {
            const isSel = activeCycleState === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCycleState(c.id)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSel ? 'rgba(59,130,246,0.18)' : 'var(--surface-2)',
                  border: `2px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: isSel ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 40-Pin DIP Layout Explorer */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>
          Intel 8086 40-Pin DIP Package Explorer (Click any pin)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Pins 1-20 (Left) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 2 }}>PINS 1–20 (LEFT SIDE)</div>
            {PINS_8086.slice(0, 20).map(p => (
              <div
                key={p.pin}
                onClick={() => setSelectedPin(p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                  background: selectedPin?.pin === p.pin ? 'rgba(59,130,246,0.25)' : 'var(--surface-2)',
                  border: `1px solid ${selectedPin?.pin === p.pin ? 'var(--accent)' : 'transparent'}`,
                  fontFamily: 'monospace', fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Pin {p.pin}</span>
                <span style={{ fontWeight: 800, color: p.type === 'Power' ? '#ef4444' : p.type === 'Input' ? '#10b981' : '#38bdf8' }}>{p.name}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.type}</span>
              </div>
            ))}
          </div>

          {/* Pins 21-40 (Right) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 2 }}>PINS 21–40 (RIGHT SIDE)</div>
            {PINS_8086.slice(20, 40).map(p => (
              <div
                key={p.pin}
                onClick={() => setSelectedPin(p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                  background: selectedPin?.pin === p.pin ? 'rgba(59,130,246,0.25)' : 'var(--surface-2)',
                  border: `1px solid ${selectedPin?.pin === p.pin ? 'var(--accent)' : 'transparent'}`,
                  fontFamily: 'monospace', fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Pin {p.pin}</span>
                <span style={{ fontWeight: 800, color: p.type === 'Power' ? '#ef4444' : p.type === 'Input' ? '#10b981' : '#38bdf8' }}>{p.name}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Pin Info */}
        {selectedPin && (
          <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--accent)' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 4 }}>
              Pin {selectedPin.pin}: {selectedPin.name} ({selectedPin.type})
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {selectedPin.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
