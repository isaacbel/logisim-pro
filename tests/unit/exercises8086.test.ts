import { describe, it, expect } from 'vitest';
import { EXERCISES_8086, gradeExercise } from '../../src/architecture/engine/exercises8086';

describe('8086 Exercise System & Auto-Grader', () => {
  it('contains at least 10 valid structured exercises across all skill levels', () => {
    expect(EXERCISES_8086.length).toBeGreaterThanOrEqual(10);
    EXERCISES_8086.forEach(ex => {
      expect(ex.id).toBeDefined();
      expect(ex.title).toBeDefined();
      expect(ex.starterCode).toBeDefined();
      expect(ex.solutionCode).toBeDefined();
      expect(ex.testCases.length).toBeGreaterThan(0);
    });
  });

  it('correctly validates and passes the official solution for exercise 1 (Add Two)', () => {
    const ex1 = EXERCISES_8086.find(e => e.id === 'ex_add_two')!;
    expect(ex1).toBeDefined();

    const result = gradeExercise(ex1, ex1.solutionCode);
    expect(result.passed).toBe(true);
    expect(result.passedCases).toBe(result.totalCases);
    expect(result.failedCases.length).toBe(0);
  });

  it('correctly fails an incorrect student solution with detailed error explanation', () => {
    const ex1 = EXERCISES_8086.find(e => e.id === 'ex_add_two')!;
    const badCode = `
      MOV AX, 0001H
      HLT
    `;
    const result = gradeExercise(ex1, badCode);
    expect(result.passed).toBe(false);
    expect(result.failedCases.length).toBeGreaterThan(0);
    expect(result.failedCases[0].details).toContain('AX: expected');
  });

  it('correctly validates and passes the swap registers exercise', () => {
    const exSwap = EXERCISES_8086.find(e => e.id === 'ex_swap_registers')!;
    expect(exSwap).toBeDefined();

    const result = gradeExercise(exSwap, exSwap.solutionCode);
    expect(result.passed).toBe(true);
  });

  it('correctly validates countdown loop exercise', () => {
    const exLoop = EXERCISES_8086.find(e => e.id === 'ex_count_down')!;
    const result = gradeExercise(exLoop, exLoop.solutionCode);
    expect(result.passed).toBe(true);
  });
});
