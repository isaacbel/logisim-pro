import { useState } from 'react';
import { Trophy, ArrowRight } from 'lucide-react';

export interface SolutionEntry {
  id: string;
  name: string;
  expression: string;
  literals: number;
  terms: number;
  gates: number;
  depth: number;
  description: string;
}

interface ComparePanelProps {
  solutions: SolutionEntry[];
  onSelectSolution: (expr: string) => void;
}

export function ComparePanel({
  solutions,
  onSelectSolution,
}: ComparePanelProps) {
  const [target, setTarget] = useState<'gates' | 'literals' | 'terms' | 'depth' | 'balanced'>('gates');

  // Determine the best solution based on selected criteria
  const ranked = [...solutions].sort((a, b) => {
    if (target === 'gates') return a.gates - b.gates || a.literals - b.literals;
    if (target === 'literals') return a.literals - b.literals || a.gates - b.gates;
    if (target === 'terms') return a.terms - b.terms || a.literals - b.literals;
    if (target === 'depth') return a.depth - b.depth || a.gates - b.gates;
    // Balanced: 0.5 * gates + 0.3 * depth + 0.2 * literals
    const scoreA = a.gates * 0.5 + a.depth * 0.3 + a.literals * 0.2;
    const scoreB = b.gates * 0.5 + b.depth * 0.3 + b.literals * 0.2;
    return scoreA - scoreB;
  });

  const bestId = ranked[0]?.id;

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trophy size={16} style={{ color: '#f59e0b' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Comparateur Multicritère des Solutions Réalisables
            </h3>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Comparez le coût en portes, littéraux et profondeur de signal selon votre cible d'optimisation.
          </p>
        </div>

        {/* Optimization Target Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Critère d'optimisation :</span>
          {[
            { id: 'gates', label: 'Min Portes' },
            { id: 'literals', label: 'Min Littéraux' },
            { id: 'terms', label: 'Min Termes' },
            { id: 'depth', label: 'Min Profondeur' },
            { id: 'balanced', label: 'Équilibré' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTarget(t.id as typeof target)}
              style={{
                padding: '4px 10px',
                borderRadius: 5,
                border: `1px solid ${target === t.id ? 'var(--accent)' : 'var(--border)'}`,
                background: target === t.id ? 'var(--accent)' : 'var(--surface-2)',
                color: target === t.id ? '#fff' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: target === t.id ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Solution</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Expression Booléenne</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Portes</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Littéraux</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Termes</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Profondeur</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {solutions.map(sol => {
              const isBest = sol.id === bestId;
              return (
                <tr
                  key={sol.id}
                  style={{
                    background: isBest ? 'rgba(16,185,129,0.1)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: isBest ? '#10b981' : 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isBest && <Trophy size={13} style={{ color: '#10b981', flexShrink: 0 }} />}
                      <span>{sol.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent)' }}>
                    {sol.expression}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                    {sol.gates}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {sol.literals}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {sol.terms}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {sol.depth}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onSelectSolution(sol.expression)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 5,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text-primary)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Charger</span>
                      <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
