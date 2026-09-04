/**
 * 8086 Addressing Modes Explorer
 * Interactive Effective Address (EA) and Physical Address calculator for all 8086 addressing modes.
 */
import { useState } from 'react';
import { Target, Calculator } from 'lucide-react';

interface AddressingModeDef {
  id: string;
  name: string;
  syntax: string;
  formula: string;
  defaultSegment: 'DS' | 'SS' | 'CS' | 'ES';
  description: string;
  registersUsed: string[];
  example: string;
}

const MODES: AddressingModeDef[] = [
  {
    id: 'immediate',
    name: '1. Immediate Addressing',
    syntax: 'MOV AX, 1234H',
    formula: 'Operand is inside instruction stream',
    defaultSegment: 'CS',
    description: 'The operand value is embedded directly within the instruction bytes following the opcode.',
    registersUsed: [],
    example: 'MOV CX, 0005H ; CX is loaded with immediate value 5',
  },
  {
    id: 'register',
    name: '2. Register Addressing',
    syntax: 'MOV AX, BX',
    formula: 'Operand is located in specified CPU register',
    defaultSegment: 'DS',
    description: 'Data resides entirely inside the 8086 register file. Fastest addressing mode with no bus memory access.',
    registersUsed: ['AX', 'BX'],
    example: 'ADD DX, SI ; Adds contents of SI into DX',
  },
  {
    id: 'direct',
    name: '3. Direct Memory Addressing',
    syntax: 'MOV AX, [0200H]',
    formula: 'EA = Disp16 ; PA = DS × 16 + Disp16',
    defaultSegment: 'DS',
    description: 'The 16-bit effective address displacement is directly specified inside brackets.',
    registersUsed: [],
    example: 'MOV [1000H], AX ; Stores AX at DS:1000H',
  },
  {
    id: 'reg_indirect',
    name: '4. Register Indirect Addressing',
    syntax: 'MOV AX, [BX]',
    formula: 'EA = [BX | BP | SI | DI]',
    defaultSegment: 'DS',
    description: 'The effective address is held in a base register (BX, BP) or index register (SI, DI). BP defaults to SS.',
    registersUsed: ['BX'],
    example: 'MOV AL, [SI] ; Reads byte at address pointed to by SI',
  },
  {
    id: 'based',
    name: '5. Based Addressing',
    syntax: 'MOV AX, [BX + 0004H]',
    formula: 'EA = [BX | BP] + Disp ; PA = (DS|SS) × 16 + EA',
    defaultSegment: 'DS',
    description: 'Effective address is computed by adding a displacement to a base register (BX or BP). Often used for struct field access.',
    registersUsed: ['BX'],
    example: 'MOV AX, [BP + 6] ; Accesses function argument on stack frame',
  },
  {
    id: 'indexed',
    name: '6. Indexed Addressing',
    syntax: 'MOV AX, [SI + 0004H]',
    formula: 'EA = [SI | DI] + Disp ; PA = DS × 16 + EA',
    defaultSegment: 'DS',
    description: 'Displacement is added to an index register (SI or DI). Ideal for accessing array elements at fixed offset.',
    registersUsed: ['SI'],
    example: 'MOV AX, [DI + 2] ; Read second element of word array',
  },
  {
    id: 'based_indexed',
    name: '7. Based-Indexed Addressing',
    syntax: 'MOV AX, [BX + SI + 0004H]',
    formula: 'EA = (BX | BP) + (SI | DI) + Disp',
    defaultSegment: 'DS',
    description: 'Combines a base register, index register, and optional displacement. Perfect for 2D array / matrix indexing.',
    registersUsed: ['BX', 'SI'],
    example: 'MOV AX, [BX + DI + 10H] ; Matrix row (BX) and column (DI) offset',
  },
  {
    id: 'relative',
    name: '8. Relative Addressing (Branches)',
    syntax: 'JMP $+08H / JZ LABEL',
    formula: 'Target IP = Current IP + Sign-Extended Disp',
    defaultSegment: 'CS',
    description: 'Used in conditional and short unconditional jumps. The branch offset is relative to the next instruction IP.',
    registersUsed: ['IP'],
    example: 'JNZ LOOP_START ; Jump backwards/forwards relative to IP',
  },
];

export function AddressingModes8086Lab() {
  const [selectedModeId, setSelectedModeId] = useState<string>('based_indexed');
  const [bx, setBx] = useState<number>(0x0200);
  const [bp, setBp] = useState<number>(0x0100);
  const [si, setSi] = useState<number>(0x0040);
  const [di, setDi] = useState<number>(0x0020);
  const [disp, setDisp] = useState<number>(0x0010);
  const [ds, setDs] = useState<number>(0x1000);
  const [ss, setSs] = useState<number>(0x2000);
  const [cs, setCs] = useState<number>(0x0700);
  const [ip, setIp] = useState<number>(0x0100);
  const [segmentOverride, setSegmentOverride] = useState<'NONE' | 'CS' | 'DS' | 'SS' | 'ES'>('NONE');

  const mode = MODES.find(m => m.id === selectedModeId) ?? MODES[0];

  const parseHex = (s: string) => parseInt(s.replace(/H$/i, '').trim(), 16) || 0;

  // Calculate EA based on mode
  let ea = 0;
  let seg = ds;

  if (segmentOverride !== 'NONE') {
    if (segmentOverride === 'CS') seg = cs;
    if (segmentOverride === 'DS') seg = ds;
    if (segmentOverride === 'SS') seg = ss;
  } else {
    seg = mode.defaultSegment === 'SS' ? ss : mode.defaultSegment === 'CS' ? cs : ds;
  }

  switch (mode.id) {
    case 'immediate':
    case 'register':
      ea = 0;
      break;
    case 'direct':
      ea = disp;
      break;
    case 'reg_indirect':
      ea = bx;
      break;
    case 'based':
      ea = (bx + disp) & 0xFFFF;
      break;
    case 'indexed':
      ea = (si + disp) & 0xFFFF;
      break;
    case 'based_indexed':
      ea = (bx + si + disp) & 0xFFFF;
      break;
    case 'relative':
      ea = (ip + disp) & 0xFFFF;
      break;
  }

  const pa = (seg * 16 + ea) & 0xFFFFF;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Addressing Modes Explorer</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Inspect all 8 Intel 8086 addressing modes with live Effective Address (EA) and 20-bit Physical Address (PA) calculation.
          </p>
        </div>
      </div>

      {/* Mode Selector Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {MODES.map(m => {
          const isSel = m.id === selectedModeId;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedModeId(m.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                textAlign: 'left',
                cursor: 'pointer',
                background: isSel ? 'rgba(59,130,246,0.18)' : 'var(--surface-1)',
                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                color: isSel ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800 }}>{m.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.syntax}</div>
            </button>
          );
        })}
      </div>

      {/* Interactive EA Calculator Card */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calculator size={14} /> Live Effective Address (EA) & Physical Address (PA) Calculator
        </div>

        {/* Inputs row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'BX (Base)', val: bx, setter: setBx },
            { label: 'BP (Base/Stack)', val: bp, setter: setBp },
            { label: 'SI (Source Idx)', val: si, setter: setSi },
            { label: 'DI (Dest Idx)', val: di, setter: setDi },
            { label: 'Disp16 (Offset)', val: disp, setter: setDisp },
            { label: 'DS (Data Seg)', val: ds, setter: setDs },
            { label: 'SS (Stack Seg)', val: ss, setter: setSs },
            { label: 'CS (Code Seg)', val: cs, setter: setCs },
            { label: 'IP (Inst Ptr)', val: ip, setter: setIp },
          ].map(inp => (
            <div key={inp.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)' }}>{inp.label}</span>
              <input
                defaultValue={`0x${inp.val.toString(16).toUpperCase().padStart(4, '0')}`}
                onBlur={e => inp.setter(parseHex(e.target.value))}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12, width: 85 }}
              />
            </div>
          ))}
        </div>

        {/* Segment Override Buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>Segment Prefix Override:</span>
          {(['NONE', 'CS', 'DS', 'SS', 'ES'] as const).map(pfx => (
            <button
              key={pfx}
              onClick={() => setSegmentOverride(pfx)}
              style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', fontWeight: 800, cursor: 'pointer',
                background: segmentOverride === pfx ? 'rgba(59,130,246,0.2)' : 'var(--surface-2)',
                border: `1px solid ${segmentOverride === pfx ? 'var(--accent)' : 'var(--border)'}`,
                color: segmentOverride === pfx ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {pfx === 'NONE' ? 'Default' : `${pfx}:`}
            </button>
          ))}
        </div>

        {/* Math Breakdown Result */}
        <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--accent)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>CALCULATION STEPS</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8 }}>
            1. Effective Address (EA) = <strong>0x{ea.toString(16).toUpperCase().padStart(4, '0')}</strong> ({mode.formula})<br />
            2. Selected Segment = <strong>0x{seg.toString(16).toUpperCase().padStart(4, '0')}</strong> ({segmentOverride !== 'NONE' ? `Overridden with ${segmentOverride}` : `Default: ${mode.defaultSegment}`})<br />
            3. Physical Address (PA) = (0x{seg.toString(16).toUpperCase().padStart(4, '0')} × 10H) + 0x{ea.toString(16).toUpperCase().padStart(4, '0')} = <span style={{ color: '#10b981', fontWeight: 900, fontSize: 15 }}>0x{pa.toString(16).toUpperCase().padStart(5, '0')}</span>
          </div>
        </div>
      </div>

      {/* Mode Details */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)', marginBottom: 6 }}>{mode.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>{mode.description}</div>
        <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, color: '#38bdf8' }}>
          <strong>Example:</strong> {mode.example}
        </div>
      </div>
    </div>
  );
}
