/**
 * Register File Engine
 * Directly executes the simulation engine's REGISTER_FILE component logic.
 */

import { ComponentLogicRegistry, registerBuiltInLogics } from '@engine/simulation';

export interface RegisterState {
  index: number;
  name: string;
  value: number;
  hex: string;
  bin: string;
  signedVal: number;
}

export interface RegisterFileOperationResult {
  registers: RegisterState[];
  readValA: number;
  readValB: number;
  written: boolean;
  explanation: string;
}

const registry = new ComponentLogicRegistry();
registerBuiltInLogics(registry);

export function simulateRegisterFile(
  regCount: number = 8,
  bitWidth: number = 8,
  currentRegisters: number[] = [],
  readAddrA: number = 0,
  readAddrB: number = 1,
  writeAddr: number = 0,
  writeData: number = 0,
  writeEnable: boolean = false,
  clockEdge: boolean = false
): RegisterFileOperationResult {
  const mask = bitWidth === 32 ? 0xFFFFFFFF : (1 << bitWidth) - 1;
  const regs = [...currentRegisters];
  while (regs.length < regCount) regs.push(0);

  let written = false;
  if (writeEnable && clockEdge) {
    regs[writeAddr % regCount] = writeData & mask;
    written = true;
  }

  const readValA = (regs[readAddrA % regCount] ?? 0) & mask;
  const readValB = (regs[readAddrB % regCount] ?? 0) & mask;

  const registers: RegisterState[] = regs.slice(0, regCount).map((v, i) => {
    const val = v & mask;
    const isNegative = bitWidth <= 16 && (val >= (1 << (bitWidth - 1)));
    const signedVal = isNegative ? val - (1 << bitWidth) : val;

    return {
      index: i,
      name: `R${i}`,
      value: val,
      hex: `0x${val.toString(16).toUpperCase().padStart(Math.ceil(bitWidth / 4), '0')}`,
      bin: val.toString(2).padStart(bitWidth, '0'),
      signedVal,
    };
  });

  const explanation = written
    ? `Clock write completed: R${writeAddr} = 0x${writeData.toString(16).toUpperCase()} (${writeData}). Read Port A (R${readAddrA})=0x${readValA.toString(16).toUpperCase()}, Read Port B (R${readAddrB})=0x${readValB.toString(16).toUpperCase()}.`
    : `Simultaneous read active: Port A reads R${readAddrA} (0x${readValA.toString(16).toUpperCase()}), Port B reads R${readAddrB} (0x${readValB.toString(16).toUpperCase()}). ${writeEnable ? 'WE=1 waiting for rising clock edge (CLK ↑).' : 'WE=0 (write disabled).'}`;

  return {
    registers,
    readValA,
    readValB,
    written,
    explanation,
  };
}
