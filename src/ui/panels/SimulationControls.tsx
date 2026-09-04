import { useAppStore } from '@state/store';
import { Play, Pause, StepForward, RotateCcw, Zap } from 'lucide-react';
import { simulationService } from '@/services/SimulationService';

export function SimulationControls() {
  const { simulation } = useAppStore();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 10px',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        background: 'var(--glass-bg)',
        border: '1px solid var(--border)',
      }}
    >
      <Zap
        size={12}
        style={{ color: simulation.isRunning ? '#fbbf24' : 'var(--text-muted)', marginRight: 2 }}
      />

      <button
        id="float-run-pause"
        data-testid="run-button"
        onClick={() => simulation.isRunning ? void simulationService.pause() : void simulationService.run()}
        title={simulation.isRunning ? 'Pause' : 'Run'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
          borderRadius: 8,
          border: 'none',
          background: simulation.isRunning ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
          color: simulation.isRunning ? '#f59e0b' : '#10b981',
          cursor: 'pointer',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {simulation.isRunning ? <Pause size={13} /> : <Play size={13} />}
      </button>

      <button
        id="float-step"
        data-testid="step-button"
        onClick={() => void simulationService.step()}
        title="Step"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
          borderRadius: 8,
          border: 'none',
          background: 'rgba(59,130,246,0.12)',
          color: '#3b82f6',
          cursor: 'pointer',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <StepForward size={13} />
      </button>

      <button
        id="float-reset"
        data-testid="reset-button"
        onClick={() => void simulationService.reset()}
        title="Reset"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 6,
          borderRadius: 8,
          border: 'none',
          background: 'rgba(107,114,128,0.12)',
          color: '#9ca3af',
          cursor: 'pointer',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <RotateCcw size={13} />
      </button>

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />

      <span style={{
        fontSize: 10,
        fontFamily: 'monospace',
        color: 'var(--text-muted)',
        letterSpacing: '-0.02em',
      }}>
        T={simulation.tick}
      </span>
    </div>
  );
}
