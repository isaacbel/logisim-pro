import { describe, it, expect } from 'vitest';
import { simulateRegisterFile } from '@/architecture/engine/registerFileEngine';

describe('Computer Architecture Lab — Register File Engine', () => {
  it('should support simultaneous asynchronous dual-port read', () => {
    const regs = [10, 20, 30, 40, 50, 60, 70, 80];
    const res = simulateRegisterFile(8, 8, regs, 2, 5, 0, 0, false, false);

    expect(res.readValA).toBe(30); // R2
    expect(res.readValB).toBe(60); // R5
    expect(res.written).toBe(false);
  });

  it('should only write on rising clock edge when Write Enable (WE) is true', () => {
    const regs = [0, 0, 0, 0];

    // WE=false, CLK=true -> No write
    const noWe = simulateRegisterFile(4, 8, regs, 0, 1, 2, 42, false, true);
    expect(noWe.registers[2].value).toBe(0);
    expect(noWe.written).toBe(false);

    // WE=true, CLK=false -> No write (waiting for edge)
    const noClk = simulateRegisterFile(4, 8, regs, 0, 1, 2, 42, true, false);
    expect(noClk.registers[2].value).toBe(0);
    expect(noClk.written).toBe(false);

    // WE=true, CLK=true -> Write successful
    const writeOk = simulateRegisterFile(4, 8, regs, 0, 1, 2, 42, true, true);
    expect(writeOk.registers[2].value).toBe(42);
    expect(writeOk.written).toBe(true);
  });

  it('should correctly format signed and unsigned decimal and hex representations', () => {
    // Value 0xFE = 254 unsigned, -2 signed (8-bit)
    const regs = [254];
    const res = simulateRegisterFile(1, 8, regs);

    expect(res.registers[0].hex).toBe('0xFE');
    expect(res.registers[0].value).toBe(254);
    expect(res.registers[0].signedVal).toBe(-2);
    expect(res.registers[0].bin).toBe('11111110');
  });
});
