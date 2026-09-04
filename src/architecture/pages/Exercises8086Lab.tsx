/**
 * 8086 Exercise Lab — Auto-graded challenges with real emulator.
 */
import { useState } from 'react';
import { Trophy, Code } from 'lucide-react';
import { EXERCISES_8086, gradeExercise, ExerciseLevel } from '../engine/exercises8086';

const LEVEL_COLORS: Record<ExerciseLevel, string> = {
  Beginner: '#10b981',
  Intermediate: '#38bdf8',
  Advanced: '#f59e0b',
  Expert: '#ef4444',
};

export function Exercises8086Lab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, ReturnType<typeof gradeExercise>>>({});
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});
  const [levelFilter, setLevelFilter] = useState<ExerciseLevel | 'All'>('All');

  const exercises = levelFilter === 'All' ? EXERCISES_8086 : EXERCISES_8086.filter(e => e.level === levelFilter);
  const passCount = Object.values(results).filter(r => r.passed).length;

  const selected = EXERCISES_8086.find(e => e.id === selectedId) ?? null;
  const currentCode = selectedId ? (codes[selectedId] ?? selected?.starterCode ?? '') : '';

  const run = () => {
    if (!selected) return;
    const code = currentCode;
    const result = gradeExercise(selected, code);
    setResults(prev => ({ ...prev, [selected.id]: result }));
  };

  const levelKeys: (ExerciseLevel | 'All')[] = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>8086 Programming Exercises</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Write assembly, press Grade — the real 8086 emulator auto-grades your solution.
            </p>
          </div>
        </div>
        <div style={{
          padding: '8px 18px', borderRadius: 30, background: passCount === EXERCISES_8086.length && passCount > 0 ? 'rgba(16,185,129,0.2)' : 'var(--surface-1)',
          border: `2px solid ${passCount > 0 ? '#10b981' : 'var(--border)'}`, fontWeight: 900, fontSize: 13, color: passCount > 0 ? '#10b981' : 'var(--text-muted)',
        }}>
          {passCount} / {EXERCISES_8086.length} solved
        </div>
      </div>

      {/* Level Filter */}
      <div style={{ display: 'flex', gap: 6 }}>
        {levelKeys.map(lv => (
          <button key={lv} onClick={() => setLevelFilter(lv)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800, cursor: 'pointer',
            background: levelFilter === lv ? (lv !== 'All' ? `${LEVEL_COLORS[lv as ExerciseLevel]}20` : 'rgba(59,130,246,0.2)') : 'var(--surface-1)',
            border: `1px solid ${levelFilter === lv ? (lv !== 'All' ? LEVEL_COLORS[lv as ExerciseLevel] : 'var(--accent)') : 'var(--border)'}`,
            color: levelFilter === lv ? (lv !== 'All' ? LEVEL_COLORS[lv as ExerciseLevel] : 'var(--accent)') : 'var(--text-muted)',
          }}>{lv}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, alignItems: 'start' }}>
        {/* Exercise List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {exercises.map(ex => {
            const result = results[ex.id];
            const isSelected = selectedId === ex.id;
            const color = LEVEL_COLORS[ex.level];
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedId(isSelected ? null : ex.id)}
                style={{
                  padding: '10px 12px', borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s',
                  background: isSelected ? `${color}15` : 'var(--surface-1)',
                  border: `1px solid ${isSelected ? color : (result?.passed ? '#10b981' : 'var(--border)')}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: isSelected ? color : 'var(--text-primary)' }}>{ex.title}</span>
                  {result && (
                    <span style={{ fontSize: 10, fontWeight: 900, color: result.passed ? '#10b981' : '#ef4444' }}>
                      {result.passed ? '✓' : `${result.passedCases}/${result.totalCases}`}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `${color}20`, color, fontWeight: 700 }}>{ex.level}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{ex.category}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Exercise Detail */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Description */}
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{selected.description}</div>
              <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 6, border: `1px solid ${LEVEL_COLORS[selected.level]}40` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: LEVEL_COLORS[selected.level], marginBottom: 3 }}>OBJECTIVE</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.objective}</div>
              </div>
            </div>

            {/* Editor */}
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Code size={13} />  Editor
              </div>
              <textarea
                value={currentCode}
                onChange={e => setCodes(prev => ({ ...prev, [selected.id]: e.target.value }))}
                spellCheck={false}
                style={{
                  width: '100%', minHeight: 220, padding: 12, borderRadius: 8, fontFamily: '"Fira Code", "Consolas", monospace',
                  fontSize: 12, lineHeight: 1.7, background: '#0d1117', color: '#e6edf3',
                  border: '1px solid var(--border)', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={run} style={{
                  padding: '6px 18px', borderRadius: 8, border: '1px solid var(--accent)', background: 'rgba(59,130,246,0.2)',
                  color: 'var(--accent)', fontSize: 12, fontWeight: 900, cursor: 'pointer',
                }}>
                  ▶ Grade Solution
                </button>
                <button onClick={() => setShowHints(p => ({ ...p, [selected.id]: !p[selected.id] }))} style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  {showHints[selected.id] ? '▲ Hide Hints' : '▼ Show Hints'}
                </button>
                <button onClick={() => setShowSolution(p => ({ ...p, [selected.id]: !p[selected.id] }))} style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  {showSolution[selected.id] ? '▲ Hide Solution' : '▼ Reveal Solution'}
                </button>
                <button onClick={() => setCodes(p => ({ ...p, [selected.id]: selected.starterCode }))} style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  ↺ Reset
                </button>
              </div>
            </div>

            {/* Hints */}
            {showHints[selected.id] && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', marginBottom: 6 }}>Hints</div>
                {selected.hints.map((h, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#f59e0b', fontWeight: 700, minWidth: 16 }}>{i + 1}.</span>
                    {h}
                  </div>
                ))}
              </div>
            )}

            {/* Solution */}
            {showSolution[selected.id] && (
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid #10b981', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#10b981', marginBottom: 6 }}>Solution Code</div>
                <pre style={{ margin: 0, fontFamily: '"Fira Code", "Consolas", monospace', fontSize: 11, color: '#10b981', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selected.solutionCode}
                </pre>
              </div>
            )}

            {/* Grade Result */}
            {results[selected.id] && (() => {
              const r = results[selected.id];
              return (
                <div style={{
                  padding: 14, borderRadius: 10, border: `2px solid ${r.passed ? '#10b981' : '#ef4444'}`,
                  background: r.passed ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: r.passed ? '#10b981' : '#ef4444', marginBottom: 6 }}>
                    {r.passed ? '✓ All Tests Passed!' : `✗ ${r.passedCases}/${r.totalCases} Tests Passed`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Executed in {r.cycles} CPU cycles
                  </div>
                  {r.failedCases.length > 0 && r.failedCases.map((fc, i) => (
                    <div key={i} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Case {fc.caseIdx + 1}: {fc.description}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fc.details}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 30, textAlign: 'center' }}>
            <Trophy size={40} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>Select an exercise from the left panel</div>
          </div>
        )}
      </div>
    </div>
  );
}
