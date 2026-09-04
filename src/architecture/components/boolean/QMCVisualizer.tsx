import { useState } from 'react';
import {
  QuineMcCluskeyResult,
} from '@engine/analysis/boolean/quineMcCluskey';
import { ChevronLeft, ChevronRight, Eye, Star, Sparkles } from 'lucide-react';

interface QMCVisualizerProps {
  result: QuineMcCluskeyResult;
  minterms: number[];
  dontCares: number[];
  variables: string[];
}

export function QMCVisualizer({
  result,
  minterms,
  dontCares,
  variables,
}: QMCVisualizerProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showAll, setShowAll] = useState<boolean>(false);

  const n = variables.length;
  const allTerms = Array.from(new Set([...minterms, ...dontCares])).sort((a, b) => a - b);

  // Group terms by count of 1s for Step 1
  const groupsByOnes: Record<number, number[]> = {};
  allTerms.forEach(m => {
    let count = 0;
    for (let i = 0; i < n; i++) if ((m >> i) & 1) count++;
    if (!groupsByOnes[count]) groupsByOnes[count] = [];
    groupsByOnes[count].push(m);
  });

  const totalSteps = 4;

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
      {/* Top Header & Step Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Visualiseur Pédagogique Quine-McCluskey &amp; Table de Petrick
            </h3>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Décomposition algorithmique complète de la minimisation exacte par couverture de mintermes.
          </p>
        </div>

        {/* Stepper buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowAll(s => !s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: showAll ? 'var(--accent)' : 'var(--surface-2)',
              color: showAll ? '#fff' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Eye size={12} />
            <span>{showAll ? 'Mode Pas-à-Pas' : 'Tout Afficher'}</span>
          </button>

          {!showAll && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                disabled={currentStep <= 1}
                onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: currentStep <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentStep <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
                Étape {currentStep} / {totalSteps}
              </span>
              <button
                disabled={currentStep >= totalSteps}
                onClick={() => setCurrentStep(s => Math.min(totalSteps, s + 1))}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: currentStep >= totalSteps ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentStep >= totalSteps ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 1: GROUP MINTERMS BY WEIGHT ───────────────────────────────── */}
      {(showAll || currentStep === 1) && (
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 8,
          padding: 14,
          border: '1px solid var(--border)',
          borderLeft: '4px solid #3b82f6',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>
            Étape 1 — Regroupement des mintermes par nombre de 1 (Poids de Hamming)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Les termes ne peuvent fusionner que s'ils appartiennent à deux groupes consécutifs (différence de poids = 1).
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {Object.entries(groupsByOnes).map(([ones, terms]) => (
              <div
                key={ones}
                style={{
                  background: 'var(--surface-1)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                  Groupe {ones} ({ones} bit{Number(ones) > 1 ? 's' : ''} à 1)
                </div>
                {terms.map(m => (
                  <div key={m} style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>m{m} {dontCares.includes(m) ? '(X)' : ''}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{m.toString(2).padStart(n, '0')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: PRIME IMPLICANTS GENERATION ────────────────────────────── */}
      {(showAll || currentStep === 2) && (
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 8,
          padding: 14,
          border: '1px solid var(--border)',
          borderLeft: '4px solid #8b5cf6',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', marginBottom: 6 }}>
            Étape 2 — Implicants Premiers Générés ({result.primeImplicants.length})
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Termes non réductibles après toutes les fusions successives adjacentes.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {result.primeImplicants.map((pi, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--surface-1)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  border: `1px solid ${pi.isEssential ? '#10b981' : 'var(--border)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: pi.isEssential ? '#10b981' : 'var(--text-primary)' }}>
                    {pi.term}
                  </span>
                  {pi.isEssential && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#10b981',
                      background: 'rgba(16,185,129,0.15)',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}>
                      <Star size={9} fill="#10b981" /> Essentiel
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                  Masque : {pi.binary} · Couvre m({pi.minterms.join(',')})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: PRIME IMPLICANT CHART ──────────────────────────────────── */}
      {(showAll || currentStep === 3) && (
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 8,
          padding: 14,
          border: '1px solid var(--border)',
          borderLeft: '4px solid #10b981',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
            Étape 3 — Table de Couverture des Implicants Premiers (Prime Implicant Chart)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Les colonnes avec une seule coche identifient les implicants essentiels (marqués ★).
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ background: 'var(--surface-1)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Implicant</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Masque</th>
                  {minterms.map(m => (
                    <th key={m} style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--accent)' }}>
                      m{m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.primeImplicants.map((pi, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      background: pi.isEssential ? 'rgba(16,185,129,0.08)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: pi.isEssential ? '#10b981' : 'var(--text-primary)' }}>
                      {pi.term} {pi.isEssential ? '★' : ''}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {pi.binary}
                    </td>
                    {minterms.map(m => {
                      const covers = pi.minterms.includes(m);
                      return (
                        <td
                          key={m}
                          style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            fontWeight: 800,
                            color: covers ? (pi.isEssential ? '#10b981' : 'var(--accent)') : 'transparent',
                          }}
                        >
                          {covers ? '✓' : '·'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STEP 4: FINAL MINIMAL SOLUTIONS ────────────────────────────────── */}
      {(showAll || currentStep === 4) && (
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 8,
          padding: 14,
          border: '1px solid var(--border)',
          borderLeft: '4px solid #f59e0b',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>
            Étape 4 — Solutions Minimales Trouvées ({result.minimalSolutions.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.minimalSolutions.map((sol, sIdx) => (
              <div
                key={sIdx}
                style={{
                  background: 'var(--surface-1)',
                  borderRadius: 6,
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                    Solution minimale #{sIdx + 1} :
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                    F = {sol.expression}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-secondary)' }}>
                  <div>{sol.cost.gates} portes · {sol.cost.literals} littéraux</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Profondeur {sol.cost.depth}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
