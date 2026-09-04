import { describe, it, expect } from 'vitest';
import { BUILTIN_TEMPLATES, getAllFunctions, getFunctionsByCategory } from '@engine/analysis/boolean/functionLibrary';
import { checkBooleanEquivalence } from '@engine/analysis/validation/booleanEquivalence';

describe('Boolean Function Library', () => {
  it('should have 17 educational built-in templates', () => {
    expect(BUILTIN_TEMPLATES.length).toBe(17);
  });

  it('should verify Half Adder Sum and Cout expressions', () => {
    const ha = BUILTIN_TEMPLATES.find(t => t.id === 'half-adder')!;
    expect(ha).toBeDefined();
    expect(ha.inputs).toEqual(['A', 'B']);

    const sumOut = ha.outputs.find(o => o.name === 'Sum')!;
    const coutOut = ha.outputs.find(o => o.name === 'Cout')!;

    // Sum should be equivalent to A ^ B
    expect(checkBooleanEquivalence(sumOut.expression, 'A ^ B').isEquivalent).toBe(true);
    // Cout should be equivalent to A.B
    expect(checkBooleanEquivalence(coutOut.expression, 'A.B').isEquivalent).toBe(true);
  });

  it('should group functions by category properly', () => {
    const cats = getFunctionsByCategory();
    expect(cats['Arithmétique']).toBeDefined();
    expect(cats['Routage de données']).toBeDefined();
    expect(cats['Codage']).toBeDefined();
    expect(cats['Portes de base']).toBeDefined();
  });
});
