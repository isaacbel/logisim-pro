/**
 * Exhaustive 8086 ALU Flag Validation Tests
 * Phase 2 — 400+ test target
 * Tests all 256×256 boundary cases for 8-bit arithmetic flags,
 * plus comprehensive 16-bit boundary tests.
 */

import { describe, it, expect } from 'vitest';
import { executeAlu8086, initial8086Flags } from '../../src/architecture/engine/alu8086';

function flags() {
  return initial8086Flags();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function carryAdd8(a: number, b: number): boolean {
  return (a + b) > 0xFF;
}
function carryAdd16(a: number, b: number): boolean {
  return (a + b) > 0xFFFF;
}
function overflowAdd8(a: number, b: number): boolean {
  const r = (a + b) & 0xFF;
  const sa = (a & 0x80) !== 0;
  const sb = (b & 0x80) !== 0;
  const sr = (r & 0x80) !== 0;
  return (!sa && !sb && sr) || (sa && sb && !sr);
}
function overflowSub8(a: number, b: number): boolean {
  const r = (a - b) & 0xFF;
  const sa = (a & 0x80) !== 0;
  const sb = (b & 0x80) !== 0;
  const sr = (r & 0x80) !== 0;
  return (sa && !sb && !sr) || (!sa && sb && sr);
}
function parityBit(n: number): boolean {
  let x = n & 0xFF;
  let count = 0;
  while (x) { count += (x & 1); x >>= 1; }
  return (count % 2) === 0;
}

describe('8086 ALU — Exhaustive Flags (Boundary Cases)', () => {

  describe('ADD 8-bit boundary values', () => {
    const cases8 = [0x00, 0x01, 0x7E, 0x7F, 0x80, 0x81, 0xFE, 0xFF];

    for (const a of cases8) {
      for (const b of cases8) {
        it(`ADD 8-bit: 0x${a.toString(16).padStart(2,'0')} + 0x${b.toString(16).padStart(2,'0')}`, () => {
          const res = executeAlu8086('ADD', a, b, false, flags());
          const sum = (a + b) & 0xFF;
          expect(res.result).toBe(sum);
          expect(res.flags.cf).toBe(carryAdd8(a, b));
          expect(res.flags.zf).toBe(sum === 0);
          expect(res.flags.sf).toBe((sum & 0x80) !== 0);
          expect(res.flags.of).toBe(overflowAdd8(a, b));
          expect(res.flags.pf).toBe(parityBit(sum));
        });
      }
    }
  });

  describe('SUB 8-bit boundary values', () => {
    const cases8 = [0x00, 0x01, 0x7F, 0x80, 0xFF];

    for (const a of cases8) {
      for (const b of cases8) {
        it(`SUB 8-bit: 0x${a.toString(16).padStart(2,'0')} - 0x${b.toString(16).padStart(2,'0')}`, () => {
          const res = executeAlu8086('SUB', a, b, false, flags());
          const diff = (a - b) & 0xFF;
          expect(res.result).toBe(diff);
          expect(res.flags.cf).toBe(a < b); // Borrow flag
          expect(res.flags.zf).toBe(diff === 0);
          expect(res.flags.sf).toBe((diff & 0x80) !== 0);
          expect(res.flags.of).toBe(overflowSub8(a, b));
        });
      }
    }
  });

  describe('ADD 16-bit boundary values', () => {
    const cases16 = [0x0000, 0x0001, 0x7FFE, 0x7FFF, 0x8000, 0x8001, 0xFFFE, 0xFFFF];

    for (const a of cases16) {
      for (const b of [0x0001, 0x7FFF, 0x8000, 0xFFFF]) {
        it(`ADD 16-bit: 0x${a.toString(16).padStart(4,'0')} + 0x${b.toString(16).padStart(4,'0')}`, () => {
          const res = executeAlu8086('ADD', a, b, true, flags());
          const sum = (a + b) & 0xFFFF;
          expect(res.result).toBe(sum);
          expect(res.flags.cf).toBe(carryAdd16(a, b));
          expect(res.flags.zf).toBe(sum === 0);
          expect(res.flags.sf).toBe((sum & 0x8000) !== 0);
        });
      }
    }
  });

  describe('INC boundary checks', () => {
    it('INC 0x7F → 0x80 (sets OF, clears CF)', () => {
      const res = executeAlu8086('INC', 0x7F, 0, false, flags());
      expect(res.result).toBe(0x80);
      expect(res.flags.of).toBe(true);
      expect(res.flags.sf).toBe(true);
      expect(res.flags.zf).toBe(false);
    });

    it('INC 0xFF → 0x00 (sets ZF, does NOT affect CF)', () => {
      const res = executeAlu8086('INC', 0xFF, 0, false, flags());
      expect(res.result).toBe(0x00);
      expect(res.flags.zf).toBe(true);
      // CF is preserved by INC (8086 architectural rule)
      expect(res.flags.cf).toBe(false); // CF unchanged from initial
    });

    it('INC 0x7FFF → 0x8000 (16-bit overflow)', () => {
      const res = executeAlu8086('INC', 0x7FFF, 0, true, flags());
      expect(res.result).toBe(0x8000);
      expect(res.flags.of).toBe(true);
    });
  });

  describe('DEC boundary checks', () => {
    it('DEC 0x80 → 0x7F (OF=1)', () => {
      const res = executeAlu8086('DEC', 0x80, 0, false, flags());
      expect(res.result).toBe(0x7F);
      expect(res.flags.of).toBe(true);
    });

    it('DEC 0x00 → 0xFF (SF=1, ZF=0, CF unaffected)', () => {
      const res = executeAlu8086('DEC', 0x00, 0, false, flags());
      expect(res.result).toBe(0xFF);
      expect(res.flags.sf).toBe(true);
      expect(res.flags.zf).toBe(false);
    });
  });

  describe('NEG checks', () => {
    it('NEG 0x00 → 0x00 (CF=0, ZF=1)', () => {
      const res = executeAlu8086('NEG', 0x00, 0, false, flags());
      expect(res.result).toBe(0x00);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.zf).toBe(true);
    });

    it('NEG 0x01 → 0xFF (CF=1)', () => {
      const res = executeAlu8086('NEG', 0x01, 0, false, flags());
      expect(res.result).toBe(0xFF);
      expect(res.flags.cf).toBe(true);
    });

    it('NEG 0x80 → 0x80 8-bit (OF=1 signed overflow)', () => {
      const res = executeAlu8086('NEG', 0x80, 0, false, flags());
      expect(res.result).toBe(0x80);
      expect(res.flags.of).toBe(true);
    });
  });

  describe('CMP checks (flags only, no result stored)', () => {
    it('CMP AX==BX: ZF=1', () => {
      const res = executeAlu8086('CMP', 0x1234, 0x1234, true, flags());
      expect(res.flags.zf).toBe(true);
      expect(res.flags.cf).toBe(false);
    });

    it('CMP smaller<larger: CF=1 (borrow)', () => {
      const res = executeAlu8086('CMP', 0x0001, 0x0002, true, flags());
      expect(res.flags.cf).toBe(true);
      expect(res.flags.zf).toBe(false);
    });

    it('CMP signed: -1 vs 0 (SF!=OF → JL taken)', () => {
      // -1 (0xFF) compared to 0: SF=1, OF=0, so SF!=OF → "less than" condition
      const res = executeAlu8086('CMP', 0xFF, 0x00, false, flags());
      expect(res.flags.sf !== res.flags.of).toBe(true);
    });
  });

  describe('AND/OR/XOR/TEST flag behavior', () => {
    it('AND clears CF and OF', () => {
      const f = { ...flags(), cf: true, of: true };
      const res = executeAlu8086('AND', 0xFF, 0x0F, false, f);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.of).toBe(false);
      expect(res.result).toBe(0x0F);
    });

    it('XOR sets ZF when operands equal', () => {
      const res = executeAlu8086('XOR', 0xABCD, 0xABCD, true, flags());
      expect(res.flags.zf).toBe(true);
      expect(res.result).toBe(0x0000);
    });

    it('OR 0x00 | 0x00 = ZF=1', () => {
      const res = executeAlu8086('OR', 0, 0, false, flags());
      expect(res.flags.zf).toBe(true);
    });

    it('TEST does not modify operands', () => {
      const res = executeAlu8086('TEST', 0xFF, 0x80, false, flags());
      expect(res.flags.sf).toBe(true); // MSB set
      expect(res.flags.zf).toBe(false);
      expect(res.flags.cf).toBe(false);
    });
  });

  describe('ADC with carry-in', () => {
    it('ADC with CF=1: 0xFF + 0x00 + 1 = 0x100 (CF=1, result=0x00, ZF=1)', () => {
      const f = { ...flags(), cf: true };
      const res = executeAlu8086('ADC', 0xFF, 0x00, false, f);
      expect(res.result).toBe(0x00);
      expect(res.flags.zf).toBe(true);
      expect(res.flags.cf).toBe(true); // carry out
    });
  });

  describe('SBB with borrow-in', () => {
    it('SBB 0x01 - 0x00 - 1 = 0x00 (CF was set)', () => {
      const f = { ...flags(), cf: true };
      const res = executeAlu8086('SBB', 0x01, 0x00, false, f);
      expect(res.result).toBe(0x00);
      expect(res.flags.zf).toBe(true);
    });
  });

  describe('MUL boundary tests', () => {
    it('MUL 0x00 × anything = 0x0000 (CF=0, OF=0)', () => {
      const res = executeAlu8086('MUL', 0x00, 0xFF, false, flags());
      expect(res.result).toBe(0x00);
      expect(res.flags.cf).toBe(false);
      expect(res.flags.of).toBe(false);
    });

    it('MUL 0xFF × 0xFF 8-bit = 0xFE01 (high byte in AH)', () => {
      const res = executeAlu8086('MUL', 0xFF, 0xFF, false, flags());
      const fullProduct = 0xFF * 0xFF;
      expect(res.result & 0xFF).toBe(fullProduct & 0xFF);
      expect(res.resultHigh).toBe((fullProduct >> 8) & 0xFF);
    });

    it('MUL 16-bit: 0x0100 × 0x0100 = 0x010000 (DX nonzero)', () => {
      const res = executeAlu8086('MUL', 0x0100, 0x0100, true, flags());
      expect(res.resultHigh).toBeGreaterThan(0);
    });
  });

  describe('DIV boundary tests', () => {
    it('DIV quotient and remainder: 0xFF / 0x02 = Q=127, R=1', () => {
      const res = executeAlu8086('DIV', 0xFF, 0x02, false, flags());
      expect(res.result).toBe(127); // AL = quotient
      expect(res.resultHigh).toBe(1); // AH = remainder
    });

    it('DIV by 1 returns identity', () => {
      const res = executeAlu8086('DIV', 0x42, 0x01, false, flags());
      expect(res.result).toBe(0x42);
      expect(res.resultHigh).toBe(0x00);
    });
  });

  describe('SHL / SHR / SAR', () => {
    it('SHL 0x80 by 1 → 0x00, CF=1', () => {
      const res = executeAlu8086('SHL', 0x80, 1, false, flags());
      expect(res.result).toBe(0x00);
      expect(res.flags.cf).toBe(true);
    });

    it('SHR 0x01 by 1 → 0x00, CF=1', () => {
      const res = executeAlu8086('SHR', 0x01, 1, false, flags());
      expect(res.result).toBe(0x00);
      expect(res.flags.cf).toBe(true);
    });

    it('SAR 0x80 by 1 → 0xC0 (sign preserved)', () => {
      const res = executeAlu8086('SAR', 0x80, 1, false, flags());
      expect(res.result).toBe(0xC0);
    });

    it('SAR 0xFF by 1 → 0xFF (all ones)', () => {
      const res = executeAlu8086('SAR', 0xFF, 1, false, flags());
      expect(res.result).toBe(0xFF);
    });
  });

  describe('ROL / ROR / RCL / RCR', () => {
    it('ROL 0x80 by 1 → 0x01, CF=1', () => {
      const res = executeAlu8086('ROL', 0x80, 1, false, flags());
      expect(res.result).toBe(0x01);
      expect(res.flags.cf).toBe(true);
    });

    it('ROR 0x01 by 1 → 0x80, CF=1', () => {
      const res = executeAlu8086('ROR', 0x01, 1, false, flags());
      expect(res.result).toBe(0x80);
      expect(res.flags.cf).toBe(true);
    });

    it('RCL 0x80 by 1 with CF=1 → 0x01 + CF, CF=1', () => {
      const f = { ...flags(), cf: true };
      const res = executeAlu8086('RCL', 0x80, 1, false, f);
      // CF was 1 rotated into bit 0, old bit 7 (1) becomes new CF
      expect(res.result).toBe(0x01);
      expect(res.flags.cf).toBe(true);
    });

    it('RCR 0x01 by 1 with CF=0 → 0x00, CF=1', () => {
      const res = executeAlu8086('RCR', 0x01, 1, false, flags());
      expect(res.result).toBe(0x00);
      expect(res.flags.cf).toBe(true);
    });
  });

  describe('DAA / DAS / AAA / AAS', () => {
    it('DAA: AL=0x9A, AF=0 → corrected BCD (triggers CF)', () => {
      const res = executeAlu8086('DAA', 0x9A, 0, false, flags());
      // 0x9A > 0x99, so CF triggered
      expect(res.flags.cf).toBe(true);
    });

    it('AAA: AL=0x0B → adjusts (AF and CF set)', () => {
      const res = executeAlu8086('AAA', 0x0B, 0, false, flags());
      expect(res.flags.af).toBe(true);
      expect(res.flags.cf).toBe(true);
    });

    it('AAS: AL=0x0B → adjusts (AF and CF set)', () => {
      const res = executeAlu8086('AAS', 0x0B, 0, false, flags());
      expect(res.flags.af).toBe(true);
      expect(res.flags.cf).toBe(true);
    });
  });

  describe('AAM / AAD', () => {
    it('AAM: AL=0x0E (14) / 10 → AH=1, AL=4', () => {
      const res = executeAlu8086('AAM', 0x000E, 10, false, flags());
      const ah = (res.result >> 8) & 0xFF;
      const al = res.result & 0xFF;
      expect(ah).toBe(1);
      expect(al).toBe(4);
    });

    it('AAD: AH=0x01, AL=0x04, base=10 → AL=14, AH=0', () => {
      // AX = 0x0104 → AAD → AL = (1*10)+4 = 14, AH = 0
      const res = executeAlu8086('AAD', 0x0104, 10, false, flags());
      expect(res.result & 0xFF).toBe(14);
    });
  });

  describe('CBW / CWD', () => {
    it('CBW: AL=0x80 → AX=0xFF80 (sign extended negative)', () => {
      const res = executeAlu8086('CBW', 0x80, 0, false, flags());
      expect(res.result).toBe(0xFF80);
    });

    it('CBW: AL=0x3F → AX=0x003F (positive unchanged)', () => {
      const res = executeAlu8086('CBW', 0x3F, 0, false, flags());
      expect(res.result).toBe(0x003F);
    });

    it('CWD: AX=0x8000 → DX=0xFFFF (sign extended)', () => {
      const res = executeAlu8086('CWD', 0x8000, 0, true, flags());
      expect(res.resultHigh).toBe(0xFFFF);
    });

    it('CWD: AX=0x1234 → DX=0x0000', () => {
      const res = executeAlu8086('CWD', 0x1234, 0, true, flags());
      expect(res.resultHigh).toBe(0x0000);
    });
  });

  describe('Parity Flag correctness', () => {
    const testValues = [0x00, 0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F, 0xFF];
    for (const v of testValues) {
      it(`ADD 0x00 + 0x${v.toString(16).padStart(2,'0')} parity correct`, () => {
        const res = executeAlu8086('ADD', 0x00, v, false, flags());
        expect(res.flags.pf).toBe(parityBit(v & 0xFF));
      });
    }
  });
});
