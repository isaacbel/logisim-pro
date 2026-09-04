/**
 * 8086 Control Unit & Micro-Operations Laboratory
 * Instruction decoder, control signals matrix, and micro-operation step sequencer.
 */
import { useState } from 'react';
import { Sliders, Play, RotateCcw, ArrowRight } from 'lucide-react';

interface MicroOpStep {
  step: number;
  tState: string;
  name: string;
  description: string;
  signals: Record<string, boolean | number>;
  activeBuses: string[];
}

interface InstructionMicroOps {
  mnemonic: string;
  description: string;
  clockCycles: number;
  steps: MicroOpStep[];
}

const INSTRUCTION_MICRO_OPS: Record<string, InstructionMicroOps> = {
  'MOV AX, [BX]': {
    mnemonic: 'MOV AX, [BX]',
    description: 'Move 16-bit word from memory at DS:BX into register AX.',
    clockCycles: 9,
    steps: [
      {
        step: 1,
        tState: 'T1',
        name: 'Fetch Instruction (Byte 1)',
        description: 'BIU puts CS:IP on address bus; asserts ALE to latch address.',
        signals: { ALE: true, 'M/IO': true, 'DT/R': false, 'RD': true, 'WR': false, 'DEN': true },
        activeBuses: ['CS:IP Adder', '20-bit Address Bus', 'Instruction Queue FIFO'],
      },
      {
        step: 2,
        tState: 'T2',
        name: 'Decode Opcode & ModR/M',
        description: 'EU instruction decoder identifies MOV reg16, [mem] with BX as base register.',
        signals: { ALE: false, 'M/IO': false, 'DT/R': false, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['Instruction Decoder', 'Register Control Logic'],
      },
      {
        step: 3,
        tState: 'T3',
        name: 'Calculate Effective Address (EA)',
        description: 'EU routes BX content to address adder: Physical Address = DS × 16 + BX.',
        signals: { ALE: true, 'M/IO': true, 'DT/R': false, 'RD': true, 'WR': false, 'DEN': false },
        activeBuses: ['BX Register Bus', 'BIU Segment Adder', 'Address Bus A0-A19'],
      },
      {
        step: 4,
        tState: 'T4',
        name: 'Memory Read Low Byte (AL)',
        description: 'Memory returns byte at DS:BX; routed over lower data bus (D0–D7) into AL.',
        signals: { ALE: false, 'M/IO': true, 'DT/R': false, 'RD': true, 'WR': false, 'DEN': true },
        activeBuses: ['Data Bus D0-D7', 'AL Internal Latch'],
      },
      {
        step: 5,
        tState: 'T5',
        name: 'Memory Read High Byte (AH)',
        description: 'Memory returns byte at DS:BX+1; routed over upper data bus (D8–D15) into AH.',
        signals: { ALE: false, 'M/IO': true, 'DT/R': false, 'RD': true, 'WR': false, 'DEN': true },
        activeBuses: ['Data Bus D8-D15', 'AH Internal Latch', 'AX Register Write Enable'],
      },
    ],
  },
  'ADD AX, BX': {
    mnemonic: 'ADD AX, BX',
    description: 'Add 16-bit register BX to AX and update all status flags (CF, PF, AF, ZF, SF, OF).',
    clockCycles: 3,
    steps: [
      {
        step: 1,
        tState: 'T1',
        name: 'Fetch & Decode',
        description: 'Decoder reads ADD AX, BX opcode (01 D8H); enables register file read ports for AX and BX.',
        signals: { ALE: false, 'M/IO': false, 'DT/R': false, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['Queue Fetch', 'Reg Read Port A (AX)', 'Reg Read Port B (BX)'],
      },
      {
        step: 2,
        tState: 'T2',
        name: 'ALU 16-bit Addition',
        description: 'ALU performs 16-bit binary addition of AX + BX. Evaluates carry-out, overflow, zero, parity, sign, and aux carry.',
        signals: { ALE: false, 'M/IO': false, 'DT/R': false, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['ALU Operand In A', 'ALU Operand In B', 'ALU Adder Core', 'Flag Generation Logic'],
      },
      {
        step: 3,
        tState: 'T3',
        name: 'Writeback & Flag Update',
        description: 'ALU sum is written back to AX register. FLAGS register is updated with new status bits.',
        signals: { ALE: false, 'M/IO': false, 'DT/R': false, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['ALU Output Bus', 'AX Write Port', 'FLAGS Register Bus'],
      },
    ],
  },
  'PUSH DX': {
    mnemonic: 'PUSH DX',
    description: 'Decrement SP by 2, write 16-bit register DX onto stack at SS:SP.',
    clockCycles: 10,
    steps: [
      {
        step: 1,
        tState: 'T1',
        name: 'SP Decrement',
        description: 'EU dedicated stack pointer subtractor decrements SP by 2 (SP ← SP - 2).',
        signals: { ALE: false, 'M/IO': false, 'DT/R': false, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['SP Decrement Adder', 'SP Register Write Port'],
      },
      {
        step: 2,
        tState: 'T2',
        name: 'Address Generation',
        description: 'BIU computes physical address PA = SS × 16 + SP and asserts ALE.',
        signals: { ALE: true, 'M/IO': true, 'DT/R': true, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['SS Register Bus', 'SP Register Bus', 'BIU Segment Adder', 'Address Bus'],
      },
      {
        step: 3,
        tState: 'T3',
        name: 'Write Low Byte (DL)',
        description: 'DL content placed on data bus D0–D7; memory WR signal asserted.',
        signals: { ALE: false, 'M/IO': true, 'DT/R': true, 'RD': false, 'WR': true, 'DEN': true },
        activeBuses: ['DL Register Output', 'Data Bus D0-D7', 'Memory Write Buffer'],
      },
      {
        step: 4,
        tState: 'T4',
        name: 'Write High Byte (DH)',
        description: 'DH content placed on data bus D8–D15; memory write completes.',
        signals: { ALE: false, 'M/IO': true, 'DT/R': true, 'RD': false, 'WR': true, 'DEN': true },
        activeBuses: ['DH Register Output', 'Data Bus D8-D15', 'Memory Write Buffer'],
      },
    ],
  },
  'CALL PROC': {
    mnemonic: 'CALL PROC',
    description: 'Near call: Pushes return IP (IP+3) onto stack, loads target offset into IP.',
    clockCycles: 19,
    steps: [
      {
        step: 1,
        tState: 'T1',
        name: 'Compute Return Address',
        description: 'EU increments IP to point to next instruction after CALL; saves IP to temp buffer.',
        signals: { ALE: false, 'M/IO': false, 'DT/R': false, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['IP Adder', 'Internal Return Address Buffer'],
      },
      {
        step: 2,
        tState: 'T2',
        name: 'Stack Push Return Address',
        description: 'SP ← SP - 2; Memory at SS:SP receives saved IP value.',
        signals: { ALE: true, 'M/IO': true, 'DT/R': true, 'RD': false, 'WR': true, 'DEN': true },
        activeBuses: ['SS:SP Segment Adder', 'Address Bus', 'Data Bus', 'Memory Interface'],
      },
      {
        step: 3,
        tState: 'T3',
        name: 'Load Target Offset into IP',
        description: 'Displacement from instruction stream is added to IP; prefetch queue is flushed.',
        signals: { ALE: false, 'M/IO': false, 'DT/R': false, 'RD': false, 'WR': false, 'DEN': false },
        activeBuses: ['Branch Target Adder', 'IP Register Write Port', 'Queue Flush Signal'],
      },
    ],
  },
};

const ALL_SIGNALS = ['ALE', 'M/IO', 'DT/R', 'RD', 'WR', 'DEN'];

export function ControlUnit8086Lab() {
  const [selectedInst, setSelectedInst] = useState<string>('MOV AX, [BX]');
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  const instData = INSTRUCTION_MICRO_OPS[selectedInst];
  const steps = instData.steps;
  const activeStep = steps[currentStepIdx] ?? steps[0];

  const handleSelectInst = (key: string) => {
    setSelectedInst(key);
    setCurrentStepIdx(0);
  };

  const nextStep = () => {
    setCurrentStepIdx(prev => (prev < steps.length - 1 ? prev + 1 : 0));
  };

  const resetSeq = () => setCurrentStepIdx(0);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sliders size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Control Unit & Micro-Operations</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Inspect instruction decoding, internal micro-operation sequences, and hardware control signal states.
          </p>
        </div>
      </div>

      {/* Instruction Selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.keys(INSTRUCTION_MICRO_OPS).map(k => (
          <button
            key={k}
            onClick={() => handleSelectInst(k)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              background: selectedInst === k ? 'rgba(59,130,246,0.2)' : 'var(--surface-1)',
              border: `1px solid ${selectedInst === k ? 'var(--accent)' : 'var(--border)'}`,
              color: selectedInst === k ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Sequence Overview Bar */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace' }}>{instData.mnemonic}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>({instData.clockCycles} Clock Cycles, {steps.length} Micro-op Steps)</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={nextStep}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 14px', borderRadius: 6,
                background: 'rgba(59,130,246,0.18)', border: '1px solid var(--accent)', color: 'var(--accent)',
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <Play size={12} /> {currentStepIdx === steps.length - 1 ? 'Loop to Start' : 'Next Step (T-State)'}
            </button>
            <button
              onClick={resetSeq}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6,
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Step Progression */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {steps.map((st, idx) => {
            const isActive = idx === currentStepIdx;
            const isDone = idx < currentStepIdx;
            return (
              <div
                key={st.step}
                onClick={() => setCurrentStepIdx(idx)}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: 10,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isActive ? 'rgba(59,130,246,0.15)' : isDone ? 'rgba(16,185,129,0.08)' : 'var(--surface-2)',
                  border: `2px solid ${isActive ? 'var(--accent)' : isDone ? '#10b981' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? 'var(--accent)' : isDone ? '#10b981' : 'var(--text-muted)' }}>
                    Step {st.step} ({st.tState})
                  </span>
                  {isDone && <span style={{ fontSize: 10, color: '#10b981' }}>✓</span>}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {st.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Step Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Left: Micro-op Description */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>
            Current Micro-Operation: {activeStep.name} ({activeStep.tState})
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
            {activeStep.description}
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6 }}>ACTIVE INTERNAL BUSES & MODULES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {activeStep.activeBuses.map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: '#38bdf8' }}>
                <ArrowRight size={12} style={{ color: '#38bdf8' }} /> {b}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Hardware Control Signal Bus */}
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', marginBottom: 12 }}>
            8086 Hardware Control Bus (Pin States)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {ALL_SIGNALS.map(sig => {
              const val = activeStep.signals[sig] ?? false;
              const isActive = Boolean(val);
              return (
                <div
                  key={sig}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: isActive ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)',
                    border: `1px solid ${isActive ? '#10b981' : 'var(--border)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: isActive ? '#10b981' : 'var(--text-muted)' }}>{sig}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                      {sig === 'ALE' ? 'Address Latch Enable' :
                       sig === 'M/IO' ? (isActive ? 'Memory Access' : 'I/O Access') :
                       sig === 'DT/R' ? (isActive ? 'Data Transmit' : 'Data Receive') :
                       sig === 'RD' ? 'Read Strobe' :
                       sig === 'WR' ? 'Write Strobe' : 'Data Enable'}
                    </div>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: 12, fontWeight: 900,
                    background: isActive ? '#10b981' : 'var(--border)', color: isActive ? '#000' : 'var(--text-muted)',
                  }}>
                    {isActive ? '1' : '0'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Unit Architecture Note */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
          Hardwired Control Logic vs. Microcode in the 8086
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          The Intel 8086 uses a hybrid approach: a <strong>microcode ROM</strong> stores the micro-routines for complex instructions (MUL, DIV, string ops, interrupt processing), while simple register-to-register arithmetic and logic instructions are decoded directly via <strong>Programmable Logic Arrays (PLA)</strong> to achieve high execution speed in 1–3 clock cycles.
        </div>
      </div>
    </div>
  );
}
