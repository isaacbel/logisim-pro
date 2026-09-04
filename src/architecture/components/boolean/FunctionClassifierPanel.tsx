import { FunctionProperties } from '@engine/analysis/boolean/functionClassifier';
import { XorAnalysisResult } from '@engine/analysis/boolean/xorOptimizer';
import { ShieldCheck, Zap } from 'lucide-react';

interface FunctionClassifierPanelProps {
  properties: FunctionProperties;
  xorAnalysis: XorAnalysisResult;
  onApplyXorExpression: (expr: string) => void;
}

export function FunctionClassifierPanel({
  properties,
  xorAnalysis,
  onApplyXorExpression,
}: FunctionClassifierPanelProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
          Classification Mathématique &amp; Propriétés Algébriques
        </h3>
      </div>

      {/* Badges Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {/* Parity */}
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Type de Parité</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: properties.isParityOdd ? '#10b981' : properties.isParityEven ? '#3b82f6' : 'var(--text-primary)', marginTop: 2 }}>
            {properties.isParityOdd ? 'Parité Impaire (XOR pur)' : properties.isParityEven ? 'Parité Paire (XNOR pur)' : 'Non paritaire'}
          </div>
        </div>

        {/* Self-Duality */}
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-Dualité</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: properties.isSelfDual ? '#8b5cf6' : 'var(--text-primary)', marginTop: 2 }}>
            {properties.isSelfDual ? 'Auto-Duale (F(x) = ¬F(¬x))' : 'Non auto-duale'}
          </div>
        </div>

        {/* Symmetry */}
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Symétrie</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: properties.isSymmetric ? '#f59e0b' : 'var(--text-primary)', marginTop: 2 }}>
            {properties.isSymmetric ? 'Symétrique (dépend du poids)' : 'Non symétrique'}
          </div>
        </div>

        {/* Monotonicity */}
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monotonie</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: properties.isMonotonic ? '#10b981' : 'var(--text-primary)', marginTop: 2 }}>
            {properties.isMonotonic ? 'Monotone Croissante' : 'Non monotone'}
          </div>
        </div>

        {/* Unateness */}
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unatité / Binité</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: properties.isBinate ? '#ec4899' : '#06b6d4', marginTop: 2 }}>
            {properties.isBinate ? 'Binate (variables bi-polaires)' : 'Unate (polarités constantes)'}
          </div>
        </div>

        {/* Balance */}
        <div style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Équilibre (2^(n-1))</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: properties.isBalanced ? '#10b981' : 'var(--text-primary)', marginTop: 2 }}>
            {properties.isBalanced ? 'Équilibrée (50% 1, 50% 0)' : 'Non équilibrée'}
          </div>
        </div>
      </div>

      {/* Detailed Unateness per variable */}
      {Object.keys(properties.isUnatePer).length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Unatité par variable :</span>
          {Object.entries(properties.isUnatePer).map(([v, u]) => (
            <span
              key={v}
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: 4,
                background: u === 'positive' ? 'rgba(16,185,129,0.15)' : u === 'negative' ? 'rgba(245,158,11,0.15)' : 'rgba(236,72,153,0.15)',
                color: u === 'positive' ? '#10b981' : u === 'negative' ? '#f59e0b' : '#ec4899',
                border: '1px solid var(--border)',
              }}
            >
              {v}: {u === 'positive' ? 'Positive (+)' : u === 'negative' ? 'Négative (-)' : 'Binate (±)'}
            </span>
          ))}
        </div>
      )}

      {/* XOR Optimization Suggestion Card */}
      {xorAnalysis.hasXorStructure && (
        <div style={{
          padding: 14,
          borderRadius: 8,
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Zap size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                Structure XOR / Parité Détectée
              </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              F = {xorAnalysis.xorExpression}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {xorAnalysis.explanation} ({xorAnalysis.xorCost.gates} portes XOR vs {xorAnalysis.sopCost.gates} portes ET/OU)
            </div>
          </div>

          <button
            onClick={() => onApplyXorExpression(xorAnalysis.xorExpression)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Optimiser avec XOR
          </button>
        </div>
      )}
    </div>
  );
}
