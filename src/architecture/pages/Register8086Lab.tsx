/**
 * 8086 Register File Laboratory
 * Interactive register viewer with AH/AL <-> AX bidirectional sync.
 */
import { useState } from 'react';
import { Database } from 'lucide-react';

interface RegState {
  ax: number; bx: number; cx: number; dx: number;
  sp: number; bp: number; si: number; di: number;
  cs: number; ds: number; ss: number; es: number;
  ip: number; flags: number;
}

const INITIAL: RegState = {
  ax: 0x1234, bx: 0x0056, cx: 0x0008, dx: 0x0000,
  sp: 0xFFFE, bp: 0x0000, si: 0x0100, di: 0x0200,
  cs: 0x0700, ds: 0x0700, ss: 0x0700, es: 0x0700,
  ip: 0x0100, flags: 0x0246,
};

type DisplayBase = 'hex' | 'bin' | 'unsigned' | 'signed';

function formatValue(val: number, base: DisplayBase, bits: 16 | 8 = 16): string {
  const mask = bits === 16 ? 0xFFFF : 0xFF;
  const v = val & mask;
  switch (base) {
    case 'hex': return `0x${v.toString(16).toUpperCase().padStart(bits / 4, '0')}`;
    case 'bin': return v.toString(2).padStart(bits, '0').replace(/(.{4})/g, '$1 ').trim();
    case 'unsigned': return v.toString(10);
    case 'signed': {
      const sign = bits === 16 ? 0x8000 : 0x80;
      return (v >= sign ? v - (1 << bits) : v).toString(10);
    }
  }
}

function BitGrid({ value, bits = 16 }: { value: number; bits?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', fontFamily: 'monospace', fontSize: 10, justifyContent: 'center' }}>
      {Array.from({ length: bits }, (_, i) => {
        const bit = (value >> (bits - 1 - i)) & 1;
        return (
          <span key={i} style={{
            width: 14, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: bit ? 'rgba(59,130,246,0.25)' : 'var(--surface-2)',
            border: `1px solid ${bit ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 2, color: bit ? 'var(--accent)' : 'var(--text-muted)', fontWeight: bit ? 800 : 400,
          }}>
            {bit}
          </span>
        );
      })}
    </div>
  );
}

function RegCard({ label, value, bits = 16, base, onEdit, subtitle }: {
  label: string; value: number; bits?: 16 | 8; base: DisplayBase;
  onEdit?: (v: number) => void; subtitle?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const commit = () => {
    const parsed = parseInt(inputVal.replace(/^0x/i, ''), 16);
    if (!isNaN(parsed) && onEdit) onEdit(parsed & (bits === 16 ? 0xFFFF : 0xFF));
    setEditing(false);
  };

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>{label}</span>
        {subtitle && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{subtitle}</span>}
      </div>
      {editing ? (
        <input
          autoFocus
          defaultValue={`0x${(value & (bits === 16 ? 0xFFFF : 0xFF)).toString(16).toUpperCase()}`}
          onChange={e => setInputVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid var(--accent)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13 }}
        />
      ) : (
        <div
          onClick={() => onEdit && setEditing(true)}
          style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)', cursor: onEdit ? 'pointer' : 'default', padding: '2px 0' }}
          title={onEdit ? 'Click to edit (hex value)' : undefined}
        >
          {formatValue(value, base, bits)}
        </div>
      )}
      {base === 'bin' && <div style={{ marginTop: 4 }}><BitGrid value={value} bits={bits} /></div>}
    </div>
  );
}

export function Register8086Lab() {
  const [regs, setRegs] = useState<RegState>(INITIAL);
  const [base, setBase] = useState<DisplayBase>('hex');

  const set = (key: keyof RegState, val: number) => {
    setRegs(prev => {
      const next = { ...prev, [key]: val & 0xFFFF };
      // Bidirectional AH/AL <-> AX sync
      if (key === 'ax') {
        // AX changed → AH and AL are derived (no extra field needed)
      }
      return next;
    });
  };

  // Derived 8-bit sub-register accessors
  const getAH = () => (regs.ax >> 8) & 0xFF;
  const getAL = () => regs.ax & 0xFF;
  const getBH = () => (regs.bx >> 8) & 0xFF;
  const getBL = () => regs.bx & 0xFF;
  const getCH = () => (regs.cx >> 8) & 0xFF;
  const getCL = () => regs.cx & 0xFF;
  const getDH = () => (regs.dx >> 8) & 0xFF;
  const getDL = () => regs.dx & 0xFF;

  const setAH = (v: number) => set('ax', (regs.ax & 0x00FF) | ((v & 0xFF) << 8));
  const setAL = (v: number) => set('ax', (regs.ax & 0xFF00) | (v & 0xFF));
  const setBH = (v: number) => set('bx', (regs.bx & 0x00FF) | ((v & 0xFF) << 8));
  const setBL = (v: number) => set('bx', (regs.bx & 0xFF00) | (v & 0xFF));
  const setCH = (v: number) => set('cx', (regs.cx & 0x00FF) | ((v & 0xFF) << 8));
  const setCL = (v: number) => set('cx', (regs.cx & 0xFF00) | (v & 0xFF));
  const setDH = (v: number) => set('dx', (regs.dx & 0x00FF) | ((v & 0xFF) << 8));
  const setDL = (v: number) => set('dx', (regs.dx & 0xFF00) | (v & 0xFF));

  const baseButtons: { id: DisplayBase; label: string }[] = [
    { id: 'hex', label: 'Hex' },
    { id: 'bin', label: 'Binary' },
    { id: 'unsigned', label: 'Unsigned' },
    { id: 'signed', label: 'Signed' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Register File Laboratory</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Click any register value to edit it. AH/AL changes automatically update AX, and vice versa.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {baseButtons.map(b => (
            <button key={b.id} onClick={() => setBase(b.id)} style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid ${base === b.id ? 'var(--accent)' : 'var(--border)'}`,
              background: base === b.id ? 'rgba(59,130,246,0.18)' : 'var(--surface-2)',
              color: base === b.id ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>{b.label}</button>
          ))}
        </div>
      </div>

      {/* General Purpose */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>General Purpose Registers (16-bit)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { name: 'AX', val: regs.ax, setter: (v: number) => set('ax', v), hint: 'Accumulator' },
            { name: 'BX', val: regs.bx, setter: (v: number) => set('bx', v), hint: 'Base' },
            { name: 'CX', val: regs.cx, setter: (v: number) => set('cx', v), hint: 'Counter' },
            { name: 'DX', val: regs.dx, setter: (v: number) => set('dx', v), hint: 'Data' },
          ].map(r => (
            <RegCard key={r.name} label={r.name} value={r.val} base={base} onEdit={r.setter} subtitle={r.hint} />
          ))}
        </div>

        {/* 8-bit sub-registers */}
        <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>8-bit Sub-Registers (bidirectionally synchronized)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
          {[
            { name: 'AH', val: getAH(), setter: setAH },
            { name: 'AL', val: getAL(), setter: setAL },
            { name: 'BH', val: getBH(), setter: setBH },
            { name: 'BL', val: getBL(), setter: setBL },
            { name: 'CH', val: getCH(), setter: setCH },
            { name: 'CL', val: getCL(), setter: setCL },
            { name: 'DH', val: getDH(), setter: setDH },
            { name: 'DL', val: getDL(), setter: setDL },
          ].map(r => (
            <RegCard key={r.name} label={r.name} value={r.val} bits={8} base={base === 'bin' ? 'bin' : 'hex'} onEdit={r.setter} />
          ))}
        </div>
      </div>

      {/* Pointer & Index */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pointer & Index Registers</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { name: 'SP', val: regs.sp, setter: (v: number) => set('sp', v), hint: 'Stack Pointer' },
            { name: 'BP', val: regs.bp, setter: (v: number) => set('bp', v), hint: 'Base Pointer' },
            { name: 'SI', val: regs.si, setter: (v: number) => set('si', v), hint: 'Source Index' },
            { name: 'DI', val: regs.di, setter: (v: number) => set('di', v), hint: 'Destination Index' },
          ].map(r => (
            <RegCard key={r.name} label={r.name} value={r.val} base={base} onEdit={r.setter} subtitle={r.hint} />
          ))}
        </div>
      </div>

      {/* Segment Registers */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Segment Registers</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { name: 'CS', val: regs.cs, setter: (v: number) => set('cs', v), hint: 'Code Segment' },
            { name: 'DS', val: regs.ds, setter: (v: number) => set('ds', v), hint: 'Data Segment' },
            { name: 'SS', val: regs.ss, setter: (v: number) => set('ss', v), hint: 'Stack Segment' },
            { name: 'ES', val: regs.es, setter: (v: number) => set('es', v), hint: 'Extra Segment' },
          ].map(r => (
            <RegCard key={r.name} label={r.name} value={r.val} base={base} onEdit={r.setter} subtitle={r.hint} />
          ))}
        </div>
        <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          CS:{(regs.cs).toString(16).toUpperCase().padStart(4, '0')}:IP({regs.ip.toString(16).toUpperCase().padStart(4, '0')}) → Physical: 0x{((regs.cs * 16 + regs.ip) & 0xFFFFF).toString(16).toUpperCase().padStart(5, '0')}<br />
          DS:{(regs.ds).toString(16).toUpperCase().padStart(4, '0')}:0000 → Physical: 0x{((regs.ds * 16) & 0xFFFFF).toString(16).toUpperCase().padStart(5, '0')}
        </div>
      </div>

      {/* Special Registers */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#ec4899', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Special Registers</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <RegCard label="IP" value={regs.ip} base={base} onEdit={v => set('ip', v)} subtitle="Instruction Pointer" />
          <RegCard label="FLAGS" value={regs.flags} base={base} onEdit={v => set('flags', v)} subtitle="Status + Control Flags" />
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'CF', bit: 0 }, { label: 'PF', bit: 2 }, { label: 'AF', bit: 4 }, { label: 'ZF', bit: 6 },
            { label: 'SF', bit: 7 }, { label: 'TF', bit: 8 }, { label: 'IF', bit: 9 }, { label: 'DF', bit: 10 }, { label: 'OF', bit: 11 },
          ].map(f => {
            const isSet = (regs.flags >> f.bit) & 1;
            return (
              <div key={f.label} style={{
                padding: '3px 10px', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, fontWeight: 800,
                background: isSet ? 'rgba(59,130,246,0.2)' : 'var(--surface-2)',
                border: `1px solid ${isSet ? 'var(--accent)' : 'var(--border)'}`,
                color: isSet ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {f.label}={isSet}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
