/**
 * 8086 Memory & Segmentation Laboratory
 * Visual 1MB memory map with segment region overlays and address calculator.
 */
import { useState } from 'react';
import { HardDrive } from 'lucide-react';

const SEG_COLORS = { cs: '#38bdf8', ds: '#10b981', ss: '#f59e0b', es: '#a78bfa' };

function hex5(n: number) { return '0x' + (n & 0xFFFFF).toString(16).toUpperCase().padStart(5, '0'); }
function hex4(n: number) { return '0x' + (n & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'); }

export function Memory8086Lab() {
  const [cs, setCs] = useState(0x0700);
  const [ds, setDs] = useState(0x0700);
  const [ss, setSs] = useState(0x0700);
  const [es, setEs] = useState(0x0700);
  const [ip, setIp] = useState(0x0100);
  const [sp, setSp] = useState(0xFFFE);
  const [ea, setEa] = useState(0x0200);
  const [di, setDi] = useState(0x0300);

  const physCS = (cs * 16 + ip) & 0xFFFFF;
  const physDS = (ds * 16 + ea) & 0xFFFFF;
  const physSS = (ss * 16 + sp) & 0xFFFFF;
  const physES = (es * 16 + di) & 0xFFFFF;

  const TOTAL_BYTES = 0x100000; // 1MB

  const segBar = (seg: number, color: string, label: string) => {
    const startPct = (seg * 16 / TOTAL_BYTES) * 100;
    const widthPct = Math.min(100 - startPct, (0x10000 / TOTAL_BYTES) * 100);
    return (
      <div key={label} style={{
        position: 'absolute', left: `${startPct}%`, width: `${widthPct}%`, top: 0, bottom: 0,
        background: `${color}30`, border: `2px solid ${color}`, borderRadius: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', fontSize: 9, fontWeight: 900, color, fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>{label}</div>
    );
  };

  const parseHexInput = (s: string) => parseInt(s.replace(/H$/i, '').trim(), 16) || 0;

  const RegInput = ({ label, val, setter, sub }: { label: string; val: number; setter: (n: number) => void; sub: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{sub}</span></div>
      <input
        defaultValue={hex4(val).replace('0x', '')}
        onBlur={e => setter(parseHexInput(e.target.value))}
        style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12, width: 90 }}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HardDrive size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Memory & Segmentation</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Adjust segment registers to see how the 8086 maps 1MB physical memory from four 64KB logical windows.
          </p>
        </div>
      </div>

      {/* Segment Register Inputs */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>Segment & Pointer Registers (hex)</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <RegInput label="CS" val={cs} setter={setCs} sub="(Code Segment)" />
          <RegInput label="IP" val={ip} setter={setIp} sub="(Instruction Pointer)" />
          <RegInput label="DS" val={ds} setter={setDs} sub="(Data Segment)" />
          <RegInput label="EA" val={ea} setter={setEa} sub="(Effective Address)" />
          <RegInput label="SS" val={ss} setter={setSs} sub="(Stack Segment)" />
          <RegInput label="SP" val={sp} setter={setSp} sub="(Stack Pointer)" />
          <RegInput label="ES" val={es} setter={setEs} sub="(Extra Segment)" />
          <RegInput label="DI" val={di} setter={setDi} sub="(Destination Index)" />
        </div>
      </div>

      {/* Calculated Physical Addresses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { label: 'Code Fetch (CS:IP)', color: SEG_COLORS.cs, seg: cs, off: ip, phys: physCS, role: 'Next instruction byte' },
          { label: 'Data Access (DS:EA)', color: SEG_COLORS.ds, seg: ds, off: ea, phys: physDS, role: 'MOV AX, [EA] target' },
          { label: 'Stack Top (SS:SP)', color: SEG_COLORS.ss, seg: ss, off: sp, phys: physSS, role: 'Current PUSH/POP location' },
          { label: 'String Dest (ES:DI)', color: SEG_COLORS.es, seg: es, off: di, phys: physES, role: 'MOVSB destination' },
        ].map(row => (
          <div key={row.label} style={{ padding: 14, background: 'var(--surface-1)', border: `2px solid ${row.color}`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: row.color, marginBottom: 6 }}>{row.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', fontWeight: 900 }}>
              ({hex4(row.seg)} × 10H) + {hex4(row.off)} = {hex5(row.phys)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{row.role}</div>
          </div>
        ))}
      </div>

      {/* 1MB Memory Map Bar */}
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 10 }}>1MB Physical Memory Map (segmented view)</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>00000H</span><span>20000H</span><span>40000H</span><span>60000H</span><span>80000H</span><span>A0000H</span><span>C0000H</span><span>E0000H</span><span>FFFFFH</span>
        </div>
        <div style={{ position: 'relative', height: 48, background: 'var(--surface-2)', borderRadius: 6, overflow: 'visible', border: '1px solid var(--border)' }}>
          {segBar(cs, SEG_COLORS.cs, 'CS')}
          {segBar(ds, SEG_COLORS.ds, 'DS')}
          {segBar(ss, SEG_COLORS.ss, 'SS')}
          {segBar(es, SEG_COLORS.es, 'ES')}
          {/* Physical address pointers */}
          {[
            { pa: physCS, color: SEG_COLORS.cs, label: 'IP' },
            { pa: physDS, color: SEG_COLORS.ds, label: 'EA' },
            { pa: physSS, color: SEG_COLORS.ss, label: 'SP' },
            { pa: physES, color: SEG_COLORS.es, label: 'DI' },
          ].map(pt => (
            <div key={pt.label} style={{
              position: 'absolute', left: `${(pt.pa / TOTAL_BYTES) * 100}%`, top: -8, bottom: -8,
              width: 2, background: pt.color, transform: 'translateX(-50%)', zIndex: 10,
            }}>
              <div style={{ position: 'absolute', top: -16, left: -6, fontSize: 8, fontWeight: 900, color: pt.color, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {pt.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'CS (code)', color: SEG_COLORS.cs },
            { label: 'DS (data)', color: SEG_COLORS.ds },
            { label: 'SS (stack)', color: SEG_COLORS.ss },
            { label: 'ES (extra)', color: SEG_COLORS.es },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, border: `2px solid ${l.color}` }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Key Rules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {[
          { title: 'Segment Overlap', body: 'Multiple segment registers can point to the same or overlapping physical regions. If CS = DS = SS = 0x0700, code, data, and stack all share the same 64KB segment.' },
          { title: '64KB Segment Size', body: 'Each segment register covers exactly 64KB (0x0000–0xFFFF offset range). The physical range is Seg×16 to Seg×16+0xFFFF.' },
          { title: 'Segment Boundary Wrap', body: 'An address at Seg=0xFFFF + Offset 0xFFFF wraps around to 0x0FFEF in the 1MB space (20-bit truncation), not to a higher address.' },
          { title: 'Implicit Segment Rules', body: 'Code always uses CS. Stack (PUSH/POP/CALL/RET) always uses SS. String destination uses ES. Data defaults to DS, but BP-based addressing uses SS.' },
        ].map(item => (
          <div key={item.title} style={{ padding: 12, background: 'var(--surface-1)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
