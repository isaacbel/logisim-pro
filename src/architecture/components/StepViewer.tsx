// ─────────────────────────────────────────────────────────────────────────────
// StepViewer — Reusable educational step-by-step navigator
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import type { CalculationStep } from '../engine/types';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';

interface StepViewerProps {
  steps: CalculationStep[];
  warnings?: string[];
  errors?: string[];
  autoPlay?: boolean;
  intervalMs?: number;
}

export function StepViewer({ steps, warnings = [], errors = [], autoPlay = false, intervalMs = 1200 }: StepViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = steps.length;

  useEffect(() => {
    setCurrentStep(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= total - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, total, intervalMs]);

  if (steps.length === 0) return null;

  const step = steps[currentStep];
  const progress = total > 1 ? (currentStep / (total - 1)) * 100 : 100;

  const COLOR_MAP: Record<string, string> = {
    result: '#10b981',
    carry: '#f59e0b',
    sign: '#ef4444',
    exponent: '#3b82f6',
    mantissa: '#8b5cf6',
    group: '#ec4899',
    bit: '#06b6d4',
  };

  const accentColor = step.highlight ? COLOR_MAP[step.highlight.type] ?? 'var(--accent)' : 'var(--accent)';

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.3)' }}>
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#ef4444', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>⚠</span> {e}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: '#f59e0b', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>⚡</span> {w}
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--border)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: accentColor, transition: 'width 0.3s ease' }} />
      </div>

      {/* Step header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Step {currentStep + 1} of {total}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          {step.title}
        </div>
      </div>

      {/* Step content */}
      <div style={{ padding: '16px 16px', minHeight: 80 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, marginBottom: step.value ? 12 : 0 }}>
          {step.description}
        </p>

        {step.value !== undefined && (
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}40`,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            color: accentColor,
            letterSpacing: '0.1em',
            marginTop: 4,
          }}>
            {step.value}
          </div>
        )}

        {step.details && Object.keys(step.details).length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(step.details).map(([k, v]) => (
              <div key={k} style={{
                padding: '4px 10px',
                background: 'var(--surface-2)',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}:</span> {String(v)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <button
          onClick={() => { setPlaying(false); setCurrentStep(0); }}
          title="Reset"
          style={ctrlBtn()}
        >
          <RotateCcw size={13} />
        </button>

        <button
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          title="Previous step"
          style={ctrlBtn(currentStep === 0)}
        >
          <ChevronLeft size={15} />
        </button>

        <button
          onClick={() => setPlaying(p => !p)}
          title={playing ? 'Pause' : 'Play'}
          style={{
            ...ctrlBtn(),
            background: playing ? 'rgba(239,68,68,0.15)' : `${accentColor}22`,
            borderColor: playing ? 'rgba(239,68,68,0.4)' : `${accentColor}50`,
            color: playing ? '#ef4444' : accentColor,
          }}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>

        <button
          onClick={() => setCurrentStep(s => Math.min(total - 1, s + 1))}
          disabled={currentStep === total - 1}
          title="Next step"
          style={ctrlBtn(currentStep === total - 1)}
        >
          <ChevronRight size={15} />
        </button>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 3, marginLeft: 8, flexWrap: 'wrap' }}>
          {steps.map((_, i) => (
            <div
              key={i}
              onClick={() => { setPlaying(false); setCurrentStep(i); }}
              style={{
                width: i === currentStep ? 14 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentStep ? accentColor : i < currentStep ? `${accentColor}60` : 'var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ctrlBtn(disabled = false): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: disabled ? 'transparent' : 'var(--surface-1)',
    color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    flexShrink: 0,
  };
}
