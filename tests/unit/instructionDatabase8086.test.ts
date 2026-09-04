import { describe, it, expect } from 'vitest';
import {
  INSTRUCTION_DATABASE,
  searchInstructions,
  getByCategory,
  INSTRUCTION_CATEGORIES,
} from '../../src/architecture/engine/instructionDatabase8086';

describe('8086 Instruction Reference Database', () => {
  it('contains entries across all major 8086 instruction categories', () => {
    expect(INSTRUCTION_DATABASE.length).toBeGreaterThanOrEqual(25);
    INSTRUCTION_CATEGORIES.forEach(cat => {
      const entries = getByCategory(cat);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  it('searches instructions by mnemonic case-insensitively', () => {
    const movResults = searchInstructions('mov');
    expect(movResults.some(i => i.mnemonic === 'MOV')).toBe(true);

    const xorResults = searchInstructions('XOR');
    expect(xorResults.some(i => i.mnemonic === 'XOR')).toBe(true);
  });

  it('provides complete timing, flags, and example data for each instruction', () => {
    INSTRUCTION_DATABASE.forEach(inst => {
      expect(inst.mnemonic).toBeTruthy();
      expect(inst.category).toBeTruthy();
      expect(inst.clocksMin).toBeGreaterThan(0);
      expect(inst.clocksMax).toBeGreaterThanOrEqual(inst.clocksMin);
      expect(inst.example.instruction).toBeTruthy();
      expect(inst.example.machineCode).toBeTruthy();
    });
  });
});
