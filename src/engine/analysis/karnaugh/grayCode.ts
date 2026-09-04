/**
 * Gray Code Generator
 * Programmatically generates n-bit reflected binary Gray code sequences.
 */

export function generateGrayCode(bits: number): string[] {
  if (bits <= 0) return ['0'];
  if (bits === 1) return ['0', '1'];

  const prev = generateGrayCode(bits - 1);
  const forward = prev.map(s => `0${s}`);
  const reversed = [...prev].reverse().map(s => `1${s}`);

  return [...forward, ...reversed];
}

export const GRAY_CODE_1 = generateGrayCode(1); // ['0', '1']
export const GRAY_CODE_2 = generateGrayCode(2); // ['00', '01', '11', '10']
export const GRAY_CODE_3 = generateGrayCode(3); // ['000', '001', '011', '010', '110', '111', '101', '100']
