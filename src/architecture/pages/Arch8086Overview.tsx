/**
 * 8086 Architecture Overview — Interactive BIU/EU Block Diagram
 * Clickable components reveal technical documentation panels.
 */
import { useState } from 'react';
import { Cpu } from 'lucide-react';

interface BlockInfo {
  id: string;
  title: string;
  body: string;
  registers?: string[];
  signals?: string[];
}

const BLOCKS: Record<string, BlockInfo> = {
  biu: {
    id: 'biu',
    title: 'Bus Interface Unit (BIU)',
    body: 'The BIU handles all bus operations for the 8086. It fetches instructions from memory into the 6-byte prefetch queue, performs address generation (Segment × 16 + Offset), and manages the 20-bit address bus and 16-bit data bus.',
    registers: ['CS', 'DS', 'SS', 'ES', 'IP'],
    signals: ['ALE', 'M/IO', 'RD', 'WR', 'DT/R', 'DEN'],
  },
  queue: {
    id: 'queue',
    title: '6-Byte Instruction Prefetch Queue',
    body: 'The BIU continuously prefetches instruction bytes from Code Segment (CS:IP) into a 6-byte FIFO queue. The EU reads from this queue, overlapping fetch and execute stages for higher throughput. When a branch is taken, the queue is flushed and refilled.',
    registers: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
    signals: ['QS0', 'QS1 (Queue Status Lines)'],
  },
  addr_gen: {
    id: 'addr_gen',
    title: 'Address Generation & Segment Adder',
    body: 'The BIU contains a dedicated 20-bit adder that computes the physical address: Physical Address = (Segment Register × 16) + Offset Register. The segment is left-shifted by 4 bits (× 16), extending the 16-bit value to 20 bits before the offset is added.',
    signals: ['20-bit Address Bus (A0–A19)', 'Segment Select (CS/DS/SS/ES)'],
  },
  eu: {
    id: 'eu',
    title: 'Execution Unit (EU)',
    body: 'The EU fetches decoded instructions from the BIU queue and executes them. It operates the ALU, controls the register file, evaluates flags, and generates memory addresses for data operands. The EU communicates back to the BIU for data memory reads and writes.',
    registers: ['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI'],
  },
  alu: {
    id: 'alu',
    title: 'Arithmetic Logic Unit (ALU)',
    body: 'The 16-bit ALU performs arithmetic (ADD, SUB, INC, DEC, MUL, DIV, NEG), logic (AND, OR, XOR, NOT), shift/rotate, and BCD decimal adjustment operations. Both 8-bit and 16-bit operation widths are supported. Results update the FLAGS register.',
    signals: ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'],
  },
  flags: {
    id: 'flags',
    title: 'FLAGS Register (16-bit)',
    body: 'The 16-bit FLAGS register holds 6 status flags updated by ALU operations and 3 control flags set by software:\n• Status: CF (Carry), PF (Parity), AF (Auxiliary Carry), ZF (Zero), SF (Sign), OF (Overflow)\n• Control: TF (Trap/Debug), IF (Interrupt Enable), DF (Direction)',
    registers: ['FLAGS (16-bit)'],
  },
  decoder: {
    id: 'decoder',
    title: 'Instruction Decoder & Control Logic',
    body: 'The EU\'s instruction decoder reads bytes from the prefetch queue and generates internal micro-operations (read operand, execute ALU, write result, update IP). It decodes ModR/M bytes, immediate fields, and addressing-mode encodings for all 8086 instructions.',
    signals: ['Micro-ops', 'Control Signals', 'ModR/M Decode', 'Displacement Parse'],
  },
  reg_file: {
    id: 'reg_file',
    title: 'General Purpose Register File',
    body: 'The 8086 has four 16-bit general-purpose registers, each accessible as a full 16-bit word or as independent high/low byte pairs:\n• AX (Accumulator) = AH:AL\n• BX (Base) = BH:BL\n• CX (Counter) = CH:CL\n• DX (Data) = DH:DL\nPlus pointer/index: SP, BP, SI, DI.',
    registers: ['AX/AH/AL', 'BX/BH/BL', 'CX/CH/CL', 'DX/DH/DL', 'SP', 'BP', 'SI', 'DI'],
  },
  segments: {
    id: 'segments',
    title: 'Segment Registers',
    body: 'The 8086 uses four 16-bit segment registers to partition the 1MB memory space into logical segments up to 64KB each:\n• CS — Code Segment (instruction fetch)\n• DS — Data Segment (default data access)\n• SS — Stack Segment (PUSH/POP/CALL/RET)\n• ES — Extra Segment (string destination)',
    registers: ['CS', 'DS', 'SS', 'ES'],
  },
};

type BlockKey = keyof typeof BLOCKS;

const BIU_BLOCK_STYLE = {
  background: 'rgba(56,189,248,0.10)',
  border: '2px solid #38bdf8',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  transition: 'all 0.18s',
};

const EU_BLOCK_STYLE = {
  background: 'rgba(203,166,247,0.10)',
  border: '2px solid #cba6f7',
  borderRadius: 10,
  padding: 14,
  cursor: 'pointer',
  transition: 'all 0.18s',
};

const BLOCK_HOVER = { boxShadow: '0 0 0 2px rgba(255,255,255,0.15)' };

function ComponentBlock({
  label, subLabel, style, onClick, active,
}: { label: string; subLabel?: string; style: React.CSSProperties; onClick: () => void; active: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...style,
        opacity: active ? 1 : 0.8,
        transform: active ? 'scale(1.02)' : 'scale(1)',
        boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.25)' : undefined,
      }}
      onMouseEnter={e => Object.assign((e.currentTarget as HTMLDivElement).style, BLOCK_HOVER)}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      <div style={{ fontWeight: 800, fontSize: 12, color: style.borderColor as string }}>{label}</div>
      {subLabel && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{subLabel}</div>}
    </div>
  );
}

export function Arch8086Overview() {
  const [selected, setSelected] = useState<BlockKey | null>(null);
  const info = selected ? BLOCKS[selected] : null;

  const toggle = (key: BlockKey) => setSelected(prev => (prev === key ? null : key));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Cpu size={24} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Intel 8086 Architecture Explorer</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Click any component to inspect its registers, signals, and educational description.
          </p>
        </div>
      </div>

      {/* Main Block Diagram */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* BIU Column */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Bus Interface Unit (BIU)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ComponentBlock label="Segment Registers" subLabel="CS · DS · SS · ES" style={BIU_BLOCK_STYLE} onClick={() => toggle('segments')} active={selected === 'segments'} />
            <ComponentBlock label="Instruction Pointer" subLabel="IP — Next Instruction Offset" style={BIU_BLOCK_STYLE} onClick={() => toggle('biu')} active={selected === 'biu'} />
            <ComponentBlock label="6-Byte Prefetch Queue" subLabel="FIFO — Q0 Q1 Q2 Q3 Q4 Q5" style={BIU_BLOCK_STYLE} onClick={() => toggle('queue')} active={selected === 'queue'} />
            <ComponentBlock label="Address Generator" subLabel="Segment × 16 + Offset = 20-bit PA" style={BIU_BLOCK_STYLE} onClick={() => toggle('addr_gen')} active={selected === 'addr_gen'} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ ...BIU_BLOCK_STYLE, fontSize: 10, fontWeight: 700, color: '#38bdf8', textAlign: 'center' }}>
                20-bit<br />Address Bus
              </div>
              <div style={{ ...BIU_BLOCK_STYLE, fontSize: 10, fontWeight: 700, color: '#38bdf8', textAlign: 'center' }}>
                16-bit<br />Data Bus
              </div>
            </div>
          </div>
        </div>

        {/* EU Column */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#cba6f7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Execution Unit (EU)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ComponentBlock label="General Purpose Registers" subLabel="AX BX CX DX | SP BP SI DI" style={EU_BLOCK_STYLE} onClick={() => toggle('reg_file')} active={selected === 'reg_file'} />
            <ComponentBlock label="Instruction Decoder" subLabel="ModR/M · Displacement · Immediate" style={EU_BLOCK_STYLE} onClick={() => toggle('decoder')} active={selected === 'decoder'} />
            <ComponentBlock label="ALU — Arithmetic Logic Unit" subLabel="ADD SUB AND OR XOR SHL MUL DIV..." style={EU_BLOCK_STYLE} onClick={() => toggle('alu')} active={selected === 'alu'} />
            <ComponentBlock label="FLAGS Register (16-bit)" subLabel="CF PF AF ZF SF TF IF DF OF" style={EU_BLOCK_STYLE} onClick={() => toggle('flags')} active={selected === 'flags'} />
            <ComponentBlock label="Execution Unit (EU)" subLabel="Reads queue → Executes → Updates state" style={EU_BLOCK_STYLE} onClick={() => toggle('eu')} active={selected === 'eu'} />
          </div>
        </div>
      </div>

      {/* Connector visual */}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        BIU ←──── Internal Data Bus (16-bit) ────→ EU
      </div>

      {/* Info Panel */}
      {info && (
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--accent)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>{info.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
            {info.body}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {info.registers && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>REGISTERS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {info.registers.map(r => (
                    <span key={r} style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.15)', border: '1px solid var(--accent)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
            {info.signals && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>SIGNALS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {info.signals.map(s => (
                    <span key={s} style={{ padding: '2px 8px', background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Physical Address Calculator mini-panel */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
          Physical Address Formula
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {[
            { seg: 'CS', off: 'IP', use: 'Instruction Fetch', color: '#38bdf8' },
            { seg: 'DS', off: 'EA', use: 'Data Read/Write', color: '#cba6f7' },
            { seg: 'SS', off: 'SP/BP', use: 'Stack Operations', color: '#f59e0b' },
            { seg: 'ES', off: 'DI', use: 'String Destination', color: '#10b981' },
          ].map(row => (
            <div key={row.seg} style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, border: `1px solid ${row.color}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: row.color }}>{row.use}</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 4, fontWeight: 800 }}>
                PA = {row.seg} × 10H + {row.off}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
