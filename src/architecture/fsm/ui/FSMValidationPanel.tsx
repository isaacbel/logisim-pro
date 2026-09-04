/**
 * FSM Validation Panel — Displays diagnostics report and rule violations.
 * Clicking a violation navigates directly to the affected state/transition.
 */
import React from 'react';
import type { ValidationResult } from '../../engine/fsmTypes';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface FSMValidationPanelProps {
  results: ValidationResult[];
  onSelectState?: (stateId: string) => void;
  onSelectTransition?: (transitionId: string) => void;
}

export const FSMValidationPanel: React.FC<FSMValidationPanelProps> = ({
  results,
  onSelectState,
  onSelectTransition,
}) => {
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const infos = results.filter(r => r.severity === 'info');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#090d16', padding: 12, overflowY: 'auto' }}>
      {/* Summary Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
          Diagnostic Rule Verification Report
        </span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
            {errors.length} Errors
          </span>
          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
            {warnings.length} Warnings
          </span>
          <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>
            {infos.length} Info
          </span>
        </div>
      </div>

      {/* List of Diagnostics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {results.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, color: '#34d399' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              All validation checks passed! FSM has valid initial state, full reachability, deterministic transitions, and complete output definitions.
            </span>
          </div>
        ) : (
          results.map(r => {
            const isErr = r.severity === 'error';
            const isWarn = r.severity === 'warning';

            const bg = isErr
              ? 'rgba(239, 68, 68, 0.1)'
              : isWarn
              ? 'rgba(245, 158, 11, 0.1)'
              : 'rgba(56, 189, 248, 0.1)';
            const border = isErr
              ? 'rgba(239, 68, 68, 0.3)'
              : isWarn
              ? 'rgba(245, 158, 11, 0.3)'
              : 'rgba(56, 189, 248, 0.3)';
            const color = isErr ? '#f87171' : isWarn ? '#fbbf24' : '#38bdf8';

            return (
              <div
                key={r.id}
                onClick={() => {
                  if (r.stateId) onSelectState?.(r.stateId);
                  if (r.transitionId) onSelectTransition?.(r.transitionId);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 6,
                  cursor: r.stateId || r.transitionId ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
              >
                {isErr ? (
                  <AlertCircle size={16} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                ) : isWarn ? (
                  <AlertTriangle size={16} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                ) : (
                  <Info size={16} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{r.message}</span>
                  {(r.stateId || r.transitionId) && (
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                      Click to highlight on diagram →
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
