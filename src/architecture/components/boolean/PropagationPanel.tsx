import { TimingAnalysisResult } from '@engine/analysis/boolean/propagationAnalyzer';
import { Clock, ArrowRight } from 'lucide-react';

interface PropagationPanelProps {
  timing: TimingAnalysisResult;
  sopDepth: number;
  nandDepth: number;
  norDepth: number;
}

export function PropagationPanel({
  timing,
  sopDepth,
  nandDepth,
  norDepth,
}: PropagationPanelProps) {
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
        <Clock size={16} style={{ color: 'var(--accent)' }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
          Délai de Propagation &amp; Niveaux Logiques (Critical Path)
        </h3>
      </div>

      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Profondeur de Portes</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>
            {timing.gateDepth} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>niveaux</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fan-In Maximum</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
            {timing.fanInMax} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>entrées/porte</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fan-Out Estimé</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>
            {timing.fanOutEstimate} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>sorties/signal</span>
          </div>
        </div>
      </div>

      {/* Critical Path Flowchart */}
      <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Chemin Critique (Signal Flow)
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {timing.criticalPath.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: idx === 0 ? 'rgba(59,130,246,0.15)' : idx === timing.criticalPath.length - 1 ? 'rgba(16,185,129,0.15)' : 'var(--surface-1)',
                border: `1px solid ${idx === 0 ? 'var(--accent)' : idx === timing.criticalPath.length - 1 ? '#10b981' : 'var(--border)'}`,
                color: idx === 0 ? 'var(--accent)' : idx === timing.criticalPath.length - 1 ? '#10b981' : 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {step}
              </span>
              {idx < timing.criticalPath.length - 1 && (
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Between Technologies */}
      <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Comparaison du Délai selon la Technologie de Portes
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--surface-1)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Standard (ET/OU)</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>{sopDepth} niveaux</div>
          </div>
          <div style={{ background: 'var(--surface-1)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tout-NAND</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981', marginTop: 2 }}>{nandDepth} niveaux</div>
          </div>
          <div style={{ background: 'var(--surface-1)', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tout-NOR</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{norDepth} niveaux</div>
          </div>
        </div>
      </div>
    </div>
  );
}
