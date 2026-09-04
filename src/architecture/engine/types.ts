// ─────────────────────────────────────────────────────────────────────────────
// Architecture Engine — Shared Types
// All calculation engines return CalculationResult<T> with structured steps.
// ─────────────────────────────────────────────────────────────────────────────

export interface CalculationStep {
  title: string;
  description: string;
  value?: string;
  details?: Record<string, string | number | boolean | string[]>;
  highlight?: {
    type: 'sign' | 'exponent' | 'mantissa' | 'carry' | 'group' | 'bit' | 'result';
    positions?: number[];
    label?: string;
  };
}

export interface CalculationResult<T = string> {
  result: T;
  steps: CalculationStep[];
  warnings: string[];
  errors: string[];
}

export type Base = 2 | 8 | 10 | 16;
export type BitWidth = 4 | 8 | 16 | 32 | 64;
export type SignedRepresentation = 'sign-magnitude' | 'ones-complement' | 'twos-complement';
export type IEEEFormat = 'float32' | 'float64';
