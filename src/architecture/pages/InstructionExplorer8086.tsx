/**
 * 8086 Instruction Reference Explorer
 * Searchable database with full technical details, timing, and encodings.
 */
import { useState, useMemo } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { INSTRUCTION_DATABASE, INSTRUCTION_CATEGORIES, searchInstructions, InstructionCategory, InstructionEntry } from '../engine/instructionDatabase8086';

const CATEGORY_COLORS: Record<InstructionCategory, string> = {
  'Data Transfer': '#38bdf8',
  'Arithmetic': '#10b981',
  'Logic': '#a78bfa',
  'Shift & Rotate': '#f59e0b',
  'Control Transfer': '#f97316',
  'String': '#ec4899',
  'Stack': '#06b6d4',
  'Processor Control': '#6b7280',
  'BCD': '#84cc16',
};

function TimingBar({ min, max, maxVal = 100 }: { min: number; max: number; maxVal?: number }) {
  return (
    <div style={{ position: 'relative', height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', flex: 1 }}>
      <div style={{
        position: 'absolute', left: `${(min / maxVal) * 100}%`, width: `${Math.max(1, ((max - min) / maxVal) * 100)}%`,
        height: '100%', background: 'var(--accent)', borderRadius: 4, opacity: 0.8,
      }} />
    </div>
  );
}

function InstructionCard({ entry, isExpanded, onToggle }: { entry: InstructionEntry; isExpanded: boolean; onToggle: () => void }) {
  const color = CATEGORY_COLORS[entry.category] ?? 'var(--accent)';
  return (
    <div style={{
      background: 'var(--surface-1)', border: `1px solid ${isExpanded ? color : 'var(--border)'}`,
      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      {/* Header row */}
      <div onClick={onToggle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 900, color }}>{entry.mnemonic}</span>
          <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 20, background: `${color}20`, color, fontWeight: 700, border: `1px solid ${color}40` }}>{entry.category}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {entry.clocksMin}–{entry.clocksMax} T-states
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Description preview */}
      <div style={{ padding: '0 14px 10px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {entry.description.slice(0, 100)}{entry.description.length > 100 ? '…' : ''}
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${color}40`, padding: 14, background: 'var(--surface-2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>SYNTAX</div>
              {entry.syntax.map(s => (
                <div key={s} style={{ fontFamily: 'monospace', fontSize: 11, color, fontWeight: 700, marginBottom: 2 }}>{s}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>OPERANDS</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{entry.operands}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>ENCODING</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{entry.opcodeBytes}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Size: {entry.instructionSize}</div>
            </div>
          </div>

          {/* Flags */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>FLAGS UPDATED</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {entry.flagsAffected.length > 0
                  ? entry.flagsAffected.map(f => (
                    <span key={f} style={{ padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, background: `${color}20`, color, border: `1px solid ${color}50` }}>{f}</span>
                  ))
                  : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>None</span>
                }
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>FLAGS CLEARED</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {entry.flagsCleared.length > 0
                  ? entry.flagsCleared.map(f => (
                    <span key={f} style={{ padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>{f}</span>
                  ))
                  : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>None</span>
                }
              </div>
            </div>
          </div>

          {/* Timing */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>CLOCK CYCLES (T-STATES @ 5 MHz)</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color, fontWeight: 700, minWidth: 20 }}>{entry.clocksMin}</span>
              <TimingBar min={entry.clocksMin} max={entry.clocksMax} maxVal={100} />
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', minWidth: 30 }}>{entry.clocksMax}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                ({(entry.clocksMax / 5000000 * 1e9).toFixed(1)} ns – {(entry.clocksMin / 5000000 * 1e9).toFixed(1)} ns)
              </span>
            </div>
          </div>

          {/* Example */}
          <div style={{ padding: 10, background: 'var(--surface-1)', borderRadius: 8, border: `1px solid ${color}30` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6 }}>EXAMPLE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}>BEFORE</span>
                <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{entry.example.before}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}>INSTRUCTION</span>
                <div style={{ fontFamily: 'monospace', color, fontWeight: 900, marginTop: 2 }}>{entry.example.instruction}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{entry.example.machineCode}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}>AFTER</span>
                <div style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 700, marginTop: 2, lineHeight: 1.5 }}>{entry.example.after}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InstructionExplorer8086() {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InstructionCategory | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const results = useMemo(() => {
    const bySearch = searchInstructions(query);
    return categoryFilter === 'All' ? bySearch : bySearch.filter(e => e.category === categoryFilter);
  }, [query, categoryFilter]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BookOpen size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Instruction Reference</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {INSTRUCTION_DATABASE.length} instructions with encodings, timing, flags, and examples.
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Search mnemonic, category, or description…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 32, padding: '7px 10px 7px 32px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)', fontSize: 12 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['All', ...INSTRUCTION_CATEGORIES] as const).map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat as typeof categoryFilter)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: categoryFilter === cat ? (cat !== 'All' ? `${CATEGORY_COLORS[cat as InstructionCategory]}20` : 'rgba(59,130,246,0.2)') : 'var(--surface-1)',
              border: `1px solid ${categoryFilter === cat ? (cat !== 'All' ? CATEGORY_COLORS[cat as InstructionCategory] : 'var(--accent)') : 'var(--border)'}`,
              color: categoryFilter === cat ? (cat !== 'All' ? CATEGORY_COLORS[cat as InstructionCategory] : 'var(--accent)') : 'var(--text-muted)',
            }}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{results.length} instruction(s) shown</div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {results.map(entry => (
          <InstructionCard
            key={entry.mnemonic}
            entry={entry}
            isExpanded={expandedId === entry.mnemonic}
            onToggle={() => setExpandedId(prev => prev === entry.mnemonic ? null : entry.mnemonic)}
          />
        ))}
      </div>
    </div>
  );
}
