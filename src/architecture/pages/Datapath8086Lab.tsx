/**
 * 8086 Datapath Laboratory
 * Interactive datapath diagram with live signal routing, bus traffic, and register flow.
 */
import { useState } from 'react';
import { GitFork, Play } from 'lucide-react';

interface DatapathFlow {
  id: string;
  name: string;
  description: string;
  src: string;
  dst: string;
  aluOp: string;
  busActive: string[];
}

const FLOWS: DatapathFlow[] = [
  {
    id: 'reg_to_reg',
    name: 'Register to Register (ADD AX, BX)',
    description: 'AX and BX are read simultaneously from the Register File onto ALU Bus A and Bus B. The ALU adds them and writes the result back to AX over the Destination Bus.',
    src: 'AX & BX Registers',
    dst: 'AX Register',
    aluOp: 'ADD (16-bit)',
    busActive: ['Reg Read Port A', 'Reg Read Port B', 'ALU Bus A', 'ALU Bus B', 'ALU Out Bus', 'Reg Write Port'],
  },
  {
    id: 'mem_read',
    name: 'Memory Read to Register (MOV AX, [SI])',
    description: 'SI is placed on the BIU address bus. BIU computes DS:SI physical address, memory returns data onto Data Bus D0-D15, which is routed through the EU internal bus into AX.',
    src: 'Memory at DS:SI',
    dst: 'AX Register',
    aluOp: 'Pass-through / Address Gen',
    busActive: ['SI Reg Bus', 'BIU Segment Adder', 'Address Bus A0-A19', 'Data Bus D0-D15', 'EU Internal Bus', 'AX Write Port'],
  },
  {
    id: 'stack_push',
    name: 'Stack Push (PUSH CX)',
    description: 'SP is decremented by 2. Physical address SS:SP is generated on the Address Bus. CX register contents are driven onto Data Bus D0-D15 into memory.',
    src: 'CX Register',
    dst: 'Memory at SS:SP',
    aluOp: 'SP Decrement (-2)',
    busActive: ['SP Decrementer', 'SS:SP Segment Adder', 'CX Reg Read Bus', 'Data Bus D0-D15', 'Memory Write Port'],
  },
  {
    id: 'jump_rel',
    name: 'Relative Jump (JMP label / JZ target)',
    description: 'Sign-extended 8-bit or 16-bit displacement from instruction queue is added to IP register by the Dedicated Address Adder. Prefetch queue is flushed.',
    src: 'Instruction Displacement',
    dst: 'IP Register',
    aluOp: 'IP + Offset Addition',
    busActive: ['Queue Stream', 'Sign Extender', 'IP Adder Bus', 'IP Write Port', 'Queue Clear Signal'],
  },
];

export function Datapath8086Lab() {
  const [selectedFlow, setSelectedFlow] = useState<string>('reg_to_reg');
  const [isSimulating, setIsSimulating] = useState(false);

  const activeFlow = FLOWS.find(f => f.id === selectedFlow) ?? FLOWS[0];

  const triggerAnimation = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 1600);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GitFork size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Datapath Laboratory</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Trace internal bus pathways, ALU operand multiplexers, and data flow between BIU and EU.
          </p>
        </div>
      </div>

      {/* Flow Selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FLOWS.map(f => (
          <button
            key={f.id}
            onClick={() => { setSelectedFlow(f.id); setIsSimulating(false); }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              background: selectedFlow === f.id ? 'rgba(59,130,246,0.2)' : 'var(--surface-1)',
              border: `1px solid ${selectedFlow === f.id ? 'var(--accent)' : 'var(--border)'}`,
              color: selectedFlow === f.id ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Datapath Visual Diagram Canvas */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
            Active Flow: {activeFlow.name}
          </div>
          <button
            onClick={triggerAnimation}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 6,
              background: 'rgba(16,185,129,0.18)', border: '1px solid #10b981', color: '#10b981',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}
          >
            <Play size={12} /> {isSimulating ? 'Animating Bus Traffic…' : 'Animate Datapath'}
          </button>
        </div>

        {/* Visual Blocks Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 14, alignItems: 'center' }}>
          {/* Source Box */}
          <div style={{
            background: isSimulating ? 'rgba(56,189,248,0.2)' : 'var(--surface-2)',
            border: `2px solid ${isSimulating ? '#38bdf8' : 'var(--border)'}`,
            borderRadius: 10, padding: 16, textAlign: 'center', transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>SOURCE</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>{activeFlow.src}</div>
          </div>

          {/* Central ALU / Adder */}
          <div style={{
            background: isSimulating ? 'rgba(203,166,247,0.25)' : 'var(--surface-2)',
            border: `2px solid ${isSimulating ? '#cba6f7' : 'var(--border)'}`,
            borderRadius: 10, padding: 14, textAlign: 'center', transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 2 }}>OPERATION</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#cba6f7', fontFamily: 'monospace' }}>{activeFlow.aluOp}</div>
          </div>

          {/* Destination Box */}
          <div style={{
            background: isSimulating ? 'rgba(16,185,129,0.2)' : 'var(--surface-2)',
            border: `2px solid ${isSimulating ? '#10b981' : 'var(--border)'}`,
            borderRadius: 10, padding: 16, textAlign: 'center', transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>DESTINATION</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>{activeFlow.dst}</div>
          </div>
        </div>

        {/* Bus Connection Lines */}
        <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8 }}>ACTIVE BUS PATHWAYS IN THIS CYCLE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeFlow.busActive.map((b, i) => (
              <span
                key={b}
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: 800,
                  background: isSimulating ? 'rgba(59,130,246,0.25)' : 'var(--surface-1)',
                  border: `1px solid ${isSimulating ? 'var(--accent)' : 'var(--border)'}`,
                  color: isSimulating ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: `all 0.2s ease ${i * 0.08}s`,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {activeFlow.description}
        </div>
      </div>

      {/* Datapath Bus Specifications */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {[
          { name: '16-bit Internal Data Bus', width: '16 bits', role: 'Connects general purpose register file to ALU operand registers and BIU data interface.' },
          { name: '20-bit Dedicated Address Bus', width: '20 bits (A0–A19)', role: 'Carries physical addresses generated by the BIU segment adder (1MB addressable range).' },
          { name: '16-bit ALU Operand Bus A & B', width: '16 bits each', role: 'Feeds the two operands directly from registers or immediate latch into the ALU core.' },
          { name: '6-Byte Instruction Queue Stream', width: '8-bit byte stream', role: 'Pipes prefetched instruction bytes from BIU into EU decoder asynchronously.' },
        ].map(item => (
          <div key={item.name} style={{ padding: 12, background: 'var(--surface-1)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{item.name}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 4 }}>Width: {item.width}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
