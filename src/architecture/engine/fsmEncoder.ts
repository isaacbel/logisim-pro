/**
 * FSM Encoder — State encoding strategies (binary, Gray code, one-hot).
 */
import type { FsmState, StateEncoding } from './fsmTypes';

/** Returns the minimum number of flip-flops needed to encode n states. */
export function bitsNeeded(n: number): number {
  if (n <= 1) return 1;
  return Math.ceil(Math.log2(n));
}

/** Gray code for index i, with `bits` bits wide. */
function grayCode(i: number, bits: number): string {
  const gray = i ^ (i >> 1);
  return gray.toString(2).padStart(bits, '0');
}

/**
 * Encode states using the given strategy.
 * Returns a Map from stateId → binary encoding string.
 */
export function encodeStates(
  states: FsmState[],
  strategy: StateEncoding = 'binary',
): Map<string, string> {
  const map = new Map<string, string>();

  if (strategy === 'one-hot') {
    const bits = Math.max(states.length, 1);
    states.forEach((s, i) => {
      const code = Array.from({ length: bits }, (_, k) => (k === i ? '1' : '0')).join('');
      map.set(s.id, code);
    });
    return map;
  }

  const numBits = bitsNeeded(states.length);

  if (strategy === 'gray') {
    states.forEach((s, i) => {
      map.set(s.id, grayCode(i, numBits));
    });
    return map;
  }

  // Binary (default)
  states.forEach((s, i) => {
    map.set(s.id, i.toString(2).padStart(numBits, '0'));
  });
  return map;
}

/** Number of flip-flops required for the given encoding strategy and state count. */
export function ffCountForEncoding(n: number, strategy: StateEncoding): number {
  if (strategy === 'one-hot') return Math.max(n, 1);
  return bitsNeeded(n);
}
