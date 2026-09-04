/**
 * 8086 I/O & Peripheral Laboratory
 * Port-mapped I/O simulator (IN/OUT), 64KB I/O address space, and standard peripherals (8255 PPI, 8259 PIC, 8253 PIT).
 */
import { useState } from 'react';
import { Terminal } from 'lucide-react';

interface PeripheralChip {
  name: string;
  ports: string;
  description: string;
  sampleCode: string;
}

const PERIPHERALS: PeripheralChip[] = [
  {
    name: '8255 Programmable Peripheral Interface (PPI)',
    ports: 'Ports 60H (Port A), 61H (Port B), 62H (Port C), 63H (Control Word)',
    description: 'Provides 24 parallel I/O lines organized into three 8-bit ports (A, B, C) with configurable input/output modes.',
    sampleCode: `; Configure 8255: Port A Input, Port B Output
MOV AL, 90H      ; Mode set control word
OUT 63H, AL      ; Write to Control register
IN  AL, 60H      ; Read byte from Port A (e.g. keyboard/switches)
OUT 61H, AL      ; Echo byte to Port B (LEDs)
`,
  },
  {
    name: '8259 Programmable Interrupt Controller (PIC)',
    ports: 'Ports 20H (Command/Status), 21H (Interrupt Mask Register - IMR)',
    description: 'Manages 8 prioritized vectored hardware interrupt lines (IRQ0–IRQ7). Handles cascade mode for up to 64 interrupts.',
    sampleCode: `; Mask IRQ0 (Timer) and enable IRQ1 (Keyboard)
IN  AL, 21H      ; Read current IMR
OR  AL, 01H      ; Set bit 0 (mask IRQ0)
AND AL, 0FDH     ; Clear bit 1 (unmask IRQ1)
OUT 21H, AL      ; Write updated IMR back
`,
  },
  {
    name: '8253 / 8254 Programmable Interval Timer (PIT)',
    ports: 'Ports 40H (Counter 0), 41H (Counter 1), 42H (Counter 2), 43H (Control Word)',
    description: 'Three independent 16-bit down-counters used for system timer ticks (IRQ0 @ 18.2 Hz), DRAM refresh, and PC speaker sound generation.',
    sampleCode: `; Program Counter 0 for square wave generator
MOV AL, 36H      ; Counter 0, LSB then MSB, Mode 3, Binary
OUT 43H, AL      ; Write Control Word
MOV AX, 4E20H    ; Divisor value (20,000)
OUT 40H, AL      ; Write LSB
MOV AL, AH
OUT 40H, AL      ; Write MSB
`,
  },
];

export function Io8086Lab() {
  const [portMap, setPortMap] = useState<Record<number, number>>({
    0x60: 0x41, // Port A data ('A')
    0x61: 0x00, // Port B
    0x21: 0x00, // IMR
  });
  const [portInput, setPortInput] = useState<string>('0060H');
  const [dataInput, setDataInput] = useState<string>('0055H');
  const [alReg, setAlReg] = useState<number>(0x00);
  const [ioLog, setIoLog] = useState<string[]>(['I/O system ready. 64KB I/O port address space (0000H–FFFFH) initialized.']);

  const parseHex = (s: string) => parseInt(s.replace(/H$/i, '').trim(), 16) || 0;

  const handleIn = () => {
    const port = parseHex(portInput) & 0xFFFF;
    const val = portMap[port] ?? 0xFF;
    setAlReg(val);
    setIoLog(prev => [`IN AL, ${port.toString(16).toUpperCase().padStart(4, '0')}H → AL loaded with 0x${val.toString(16).toUpperCase().padStart(2, '0')}`, ...prev.slice(0, 9)]);
  };

  const handleOut = () => {
    const port = parseHex(portInput) & 0xFFFF;
    const val = parseHex(dataInput) & 0xFF;
    setPortMap(prev => ({ ...prev, [port]: val }));
    setIoLog(prev => [`OUT ${port.toString(16).toUpperCase().padStart(4, '0')}H, AL (0x${val.toString(16).toUpperCase().padStart(2, '0')}) → Port updated.`, ...prev.slice(0, 9)]);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Terminal size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 I/O Space & Peripheral Laboratory</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Simulate Intel 8086 port-mapped I/O with IN/OUT instructions and explore peripheral controller chips.
          </p>
        </div>
      </div>

      {/* IN / OUT Simulator Card */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>
          IN / OUT Instruction Simulator
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>I/O Port Address (0000H–FFFFH)</div>
            <input
              value={portInput}
              onChange={e => setPortInput(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12, width: 110 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>Data Byte (for OUT instruction)</div>
            <input
              value={dataInput}
              onChange={e => setDataInput(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12, width: 110 }}
            />
          </div>
          <button
            onClick={handleIn}
            style={{
              padding: '6px 16px', borderRadius: 6, background: 'rgba(56,189,248,0.18)', border: '1px solid #38bdf8', color: '#38bdf8',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}
          >
            IN AL, DX/port
          </button>
          <button
            onClick={handleOut}
            style={{
              padding: '6px 16px', borderRadius: 6, background: 'rgba(16,185,129,0.18)', border: '1px solid #10b981', color: '#10b981',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}
          >
            OUT DX/port, AL
          </button>
          <div style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--accent)', fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)', fontWeight: 900 }}>
            AL = 0x{alReg.toString(16).toUpperCase().padStart(2, '0')}
          </div>
        </div>

        {/* I/O Log */}
        <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10 }}>
          {ioLog.map((l, i) => (
            <div key={i} style={{ color: i === 0 ? '#10b981' : 'var(--text-muted)', lineHeight: 1.6 }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Standard 8086 Peripheral Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Standard Intel 8086 Support Peripheral Chips</div>
        {PERIPHERALS.map(chip => (
          <div key={chip.name} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--accent)', marginBottom: 2 }}>{chip.name}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace', marginBottom: 6 }}>{chip.ports}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{chip.description}</div>
            <pre style={{ margin: 0, padding: 10, borderRadius: 6, background: '#0d1117', color: '#e6edf3', fontFamily: '"Fira Code", monospace', fontSize: 11, lineHeight: 1.6 }}>
              {chip.sampleCode}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
