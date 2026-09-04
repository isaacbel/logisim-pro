import { useAppStore } from '@state/store';
import { Activity, Zap, Layers, ZoomIn, ZoomOut } from 'lucide-react';

function Sep() {
  return <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>;
}

export function StatusBar() {
  const { simulation, viewport, renderStats, project, currentCircuitId } = useAppStore();

  const circuit = project?.circuits.find(c => c.id === currentCircuitId);
  const componentCount = circuit?.components.length ?? 0;
  const wireCount = circuit?.wires.length ?? 0;

  const scale = viewport.transform.scale;
  const zoomPct = Math.round(scale * 100);

  const item = (content: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {content}
    </div>
  );

  return (
    <div className="app-statusbar" style={{ color: 'var(--text-muted)' }}>
      {/* Simulation status */}
      {item(<>
        <Activity
          size={10}
          style={{ color: simulation.isRunning ? '#10b981' : 'var(--text-muted)' }}
        />
        <span style={{ color: simulation.isRunning ? '#10b981' : 'var(--text-muted)' }}>
          {simulation.isRunning
            ? 'Running'
            : simulation.mode === 'stepped'
            ? 'Stepped'
            : 'Paused'}
        </span>
      </>)}

      <Sep />

      {/* Tick */}
      {item(<>
        <Zap size={10} />
        <span>Tick {simulation.tick}</span>
      </>)}

      <Sep />

      {/* Component / wire counts */}
      {item(<>
        <Layers size={10} />
        <span>{componentCount} components · {wireCount} wires</span>
      </>)}

      <Sep />

      {/* FPS */}
      {item(
        <span style={{
          color: renderStats.fps >= 55 ? '#10b981'
               : renderStats.fps >= 30 ? '#f59e0b'
               : '#ef4444',
        }}>
          {renderStats.fps} FPS
        </span>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Hazard indicator */}
      {simulation.detectedHazards.length > 0 && (
        <>
          {item(
            <span style={{ color: '#f59e0b' }}>
              ⚠ {simulation.detectedHazards.length} hazard{simulation.detectedHazards.length > 1 ? 's' : ''}
            </span>
          )}
          <Sep />
        </>
      )}

      {/* Zoom controls */}
      {item(<>
        <button
          onClick={() => useAppStore.getState().setZoom(Math.max(0.1, scale - 0.1))}
          title="Zoom Out"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
        >
          <ZoomOut size={10} />
        </button>
        <span style={{ fontFamily: 'monospace', minWidth: 38, textAlign: 'center', fontSize: 11 }}>
          {zoomPct}%
        </span>
        <button
          onClick={() => useAppStore.getState().setZoom(Math.min(10, scale + 0.1))}
          title="Zoom In"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
        >
          <ZoomIn size={10} />
        </button>
      </>)}

      <Sep />

      {/* Speed */}
      <span>{simulation.speed}</span>
    </div>
  );
}
