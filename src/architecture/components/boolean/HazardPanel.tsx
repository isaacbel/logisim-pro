// ─────────────────────────────────────────────────────────────────────────────
// HazardPanel — Combinational Glitch & Static Hazard Analysis
// ─────────────────────────────────────────────────────────────────────────────
import { HazardAnalysisResult } from '@engine/analysis/boolean/hazardAnalyzer';
import { AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface HazardPanelProps {
  hazardResult: HazardAnalysisResult;
  onApplyHazardFreeExpression: (expr: string) => void;
}

export function HazardPanel({
  hazardResult,
  onApplyHazardFreeExpression,
}: HazardPanelProps) {
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
            <AlertTriangle size={16} style={{ color: hazardResult.hasHazards ? '#f59e0b' : '#10b981' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Analyse des Aléas Statiques (Hazards &amp; Glitches)
            </h3>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Détection des transitions de signaux asynchrones causant des impulsions parasites (glitches 1➔0➔1 ou 0➔1➔0).
          </p>
        </div>

        {hazardResult.hasHazards ? (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: '#f59e0b',
            background: 'rgba(245,158,11,0.12)',
            padding: '4px 8px',
            borderRadius: 6,
          }}>
            {hazardResult.hazards.length} aléa(s) détecté(s)
          </span>
        ) : (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: '#10b981',
            background: 'rgba(16,185,129,0.12)',
            padding: '4px 8px',
            borderRadius: 6,
          }}>
            <CheckCircle2 size={13} /> Circuit sans aléa
          </span>
        )}
      </div>

      {/* Hazards List */}
      {hazardResult.hazards.length === 0 ? (
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <ShieldCheck size={20} style={{ color: '#10b981', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
              Aucun aléa statique détecté
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Toutes les transitions adjacentes de 1 à 1 sont couvertes sans discontinuité de propagation.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hazardResult.hazards.map((h, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface-2)',
                borderRadius: 8,
                padding: '12px 14px',
                borderLeft: `4px solid ${h.type === 'static-1' ? '#f59e0b' : '#3b82f6'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: h.type === 'static-1' ? '#f59e0b' : '#3b82f6' }}>
                  Aléa {h.type === 'static-1' ? 'Statique-1' : 'Statique-0'} — Variable {h.variable}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  Transition m{h.fromMinterm} ➔ m{h.toMinterm}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {h.explanation}
              </div>
              {h.redundantTerm && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--accent)' }}>
                  Terme de consensus recommandé : <code style={{ fontWeight: 700 }}>{h.redundantTerm}</code>
                </div>
              )}
            </div>
          ))}

          {/* Hazard-free Expression Box */}
          <div style={{
            marginTop: 6,
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Forme avec Termes de Consensus (Sans Aléa) :
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>
                F = {hazardResult.hazardFreeExpression}
              </div>
            </div>

            <button
              onClick={() => onApplyHazardFreeExpression(hazardResult.hazardFreeExpression)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>Appliquer la forme sans aléa</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
