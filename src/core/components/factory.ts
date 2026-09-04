import { nanoid } from 'nanoid';
import { SignalValue } from '@apptypes/core';
import type { CircuitComponent, ComponentCategory, Pin, PinDirection, Circuit, PropertyValue } from '@apptypes/core';

export const categoryFor = (type: string): ComponentCategory => {
  if (['SWITCH', 'PUSH_BUTTON', 'CONSTANT', 'CONSTANT_0', 'CONSTANT_1', 'RESULT_CONSTANT', 'INPUT_PIN'].includes(type)) return 'inputs';
  if (type === 'CLOCK') return 'clock';
  if (['LED', 'RGB_LED', 'SEVEN_SEGMENT', 'HEX_DISPLAY', 'LCD', 'OUTPUT_PIN', 'PROBE'].includes(type)) return 'outputs';
  if (['SR_LATCH', 'D_LATCH', 'SR_FLIPFLOP', 'D_FLIPFLOP', 'JK_FLIPFLOP', 'T_FLIPFLOP', 'REGISTER', 'SHIFT_REGISTER', 'COUNTER', 'DECADE_COUNTER', 'RING_COUNTER', 'JOHNSON_COUNTER', 'RAM', 'ROM', 'REGISTER_FILE', 'FIFO', 'STACK', 'LIFO'].includes(type)) return 'memory';
  if (['HALF_ADDER', 'FULL_ADDER', 'ADDER', 'HALF_SUBTRACTOR', 'FULL_SUBTRACTOR', 'SUBTRACTOR', 'ADDER_SUBTRACTOR', 'CARRY_LOOKAHEAD_ADDER', 'COMPARATOR', 'ALU', 'MULTIPLIER', 'DIVIDER', 'INCREMENTER', 'DECREMENTER', 'NEGATOR'].includes(type)) return 'arithmetic';
  if (['MULTIPLEXER', 'DEMULTIPLEXER', 'ENCODER', 'PRIORITY_ENCODER', 'DECODER', 'BCD_TO_7SEG', 'GRAY_ENCODER', 'GRAY_DECODER', 'BCD_ENCODER', 'BCD_DECODER'].includes(type)) return 'plexers';
  if (['SPLITTER', 'MERGER', 'TUNNEL', 'BIT_SELECTOR', 'BUS_TAP', 'TEXT', 'SUBCIRCUIT'].includes(type)) return 'wiring';
  return 'gates';
};

const pin = (name: string, direction: PinDirection, x: number, y: number, bitWidth = 1): Pin => ({
  id: nanoid(),
  name,
  direction,
  bitWidth,
  position: { x, y },
  shape: bitWidth > 1 ? 'bus' : 'line',
  currentValue: SignalValue.UNKNOWN,
  connectedWireIds: [],
});

export function createPins(type: string, config?: number | Record<string, unknown>, subcircuitRef?: Circuit): Pin[] {
  let props: Record<string, unknown> = {};
  if (typeof config === 'number') {
    props = { inputCount: config };
  } else if (config) {
    props = config;
  }

  const inputCount = Math.max(2, Math.min(8, (props.inputCount as number) ?? 2));
  const bitWidth = Math.max(1, Math.min(64, (props.bitWidth as number) ?? 4));
  const selBits = Math.max(1, Math.min(6, (props.selBits as number) ?? 1));
  const addrWidth = Math.max(1, Math.min(16, (props.addrWidth as number) ?? 4));
  const dataWidth = Math.max(1, Math.min(64, (props.dataWidth as number) ?? 8));

  switch (type) {
    // ── Single-Input Gates ────────────────────────────────────────────────
    case 'NOT':
    case 'BUFFER':
      return [
        pin('A', 'input', 0, 20),
        pin('Y', 'output', 50, 20),
      ];

    case 'TRI_STATE_BUFFER':
      return [
        pin('A', 'input', 0, 15),
        pin('EN', 'input', 25, 40),
        pin('Y', 'output', 50, 15),
      ];

    // ── Inputs & Constants ────────────────────────────────────────────────
    case 'SWITCH':
    case 'PUSH_BUTTON':
    case 'CLOCK':
      return [pin('Y', 'output', 50, 20)];

    case 'INPUT_PIN':
      return [pin('OUT', 'output', 40, 20, bitWidth)];

    case 'OUTPUT_PIN':
      return [pin('IN', 'input', 0, 20, bitWidth)];

    case 'PROBE':
      return [pin('IN', 'input', 0, 20, bitWidth)];

    case 'CONSTANT':
    case 'CONSTANT_0':
    case 'CONSTANT_1':
      return [pin('Y', 'output', 40, 20)];

    case 'RESULT_CONSTANT': {
      if (bitWidth === 1) {
        return [pin('Y', 'output', 50, 20)];
      }
      const pins: Pin[] = [];
      const pinSpacing = bitWidth > 32 ? 10 : bitWidth > 16 ? 12 : 16;
      const width = bitWidth > 32 ? 90 : bitWidth > 16 ? 75 : 60;
      for (let i = 0; i < bitWidth; i++) {
        pins.push(pin(`Q${i}`, 'output', width, 15 + i * pinSpacing));
      }
      return pins;
    }

    // ── Outputs ───────────────────────────────────────────────────────────
    case 'LED':
      return [pin('A', 'input', 0, 20)];

    case 'RGB_LED':
      return [
        pin('R', 'input', 0, 10),
        pin('G', 'input', 0, 25),
        pin('B', 'input', 0, 40),
      ];

    case 'SEVEN_SEGMENT':
      return ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name, i) =>
        pin(name, 'input', 0, 10 + i * 12)
      );

    case 'HEX_DISPLAY':
      return ['D0', 'D1', 'D2', 'D3'].map((name, i) =>
        pin(name, 'input', 0, 10 + i * 15)
      );

    case 'LCD':
      return [
        pin('CLK', 'input', 0, 10),
        pin('DATA', 'input', 0, 25),
      ];

    // ── Arithmetic ────────────────────────────────────────────────────────
    case 'HALF_ADDER':
      return [
        pin('A', 'input', 0, 15),
        pin('B', 'input', 0, 35),
        pin('S', 'output', 50, 15),
        pin('C', 'output', 50, 35),
      ];

    case 'FULL_ADDER':
      return [
        pin('A', 'input', 0, 15),
        pin('B', 'input', 0, 30),
        pin('Cin', 'input', 0, 45),
        pin('S', 'output', 60, 20),
        pin('Cout', 'output', 60, 40),
      ];

    case 'HALF_SUBTRACTOR':
      return [
        pin('A', 'input', 0, 15),
        pin('B', 'input', 0, 35),
        pin('D', 'output', 50, 15),
        pin('Bout', 'output', 50, 35),
      ];

    case 'FULL_SUBTRACTOR':
      return [
        pin('A', 'input', 0, 15),
        pin('B', 'input', 0, 30),
        pin('Bin', 'input', 0, 45),
        pin('D', 'output', 60, 20),
        pin('Bout', 'output', 60, 40),
      ];

    case 'ADDER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      pins.push(pin('Cin', 'input', 0, 15 + bitWidth * 2 * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`S${i}`, 'output', 60, 15 + i * 16));
      pins.push(pin('Cout', 'output', 60, 15 + bitWidth * 16));
      return pins;
    }

    case 'CARRY_LOOKAHEAD_ADDER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      pins.push(pin('Cin', 'input', 0, 15 + bitWidth * 2 * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`S${i}`, 'output', 65, 15 + i * 16));
      pins.push(pin('Cout', 'output', 65, 15 + bitWidth * 16));
      pins.push(pin('PG', 'output', 65, 15 + (bitWidth + 1) * 16));
      pins.push(pin('GG', 'output', 65, 15 + (bitWidth + 2) * 16));
      return pins;
    }

    case 'SUBTRACTOR': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      pins.push(pin('Bin', 'input', 0, 15 + bitWidth * 2 * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`D${i}`, 'output', 60, 15 + i * 16));
      pins.push(pin('Bout', 'output', 60, 15 + bitWidth * 16));
      return pins;
    }

    case 'ADDER_SUBTRACTOR': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      pins.push(pin('SUB', 'input', 0, 15 + bitWidth * 2 * 16));
      pins.push(pin('Cin', 'input', 0, 15 + (bitWidth * 2 + 1) * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`S${i}`, 'output', 60, 15 + i * 16));
      pins.push(pin('Cout', 'output', 60, 15 + bitWidth * 16));
      return pins;
    }

    case 'INCREMENTER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      pins.push(pin('EN', 'input', 0, 15 + bitWidth * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Y${i}`, 'output', 60, 15 + i * 16));
      pins.push(pin('Cout', 'output', 60, 15 + bitWidth * 16));
      return pins;
    }

    case 'DECREMENTER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      pins.push(pin('EN', 'input', 0, 15 + bitWidth * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Y${i}`, 'output', 60, 15 + i * 16));
      pins.push(pin('Bout', 'output', 60, 15 + bitWidth * 16));
      return pins;
    }

    case 'NEGATOR': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Y${i}`, 'output', 60, 15 + i * 16));
      return pins;
    }

    case 'MULTIPLIER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      for (let i = 0; i < bitWidth * 2; i++) pins.push(pin(`P${i}`, 'output', 65, 15 + i * 16));
      return pins;
    }

    case 'DIVIDER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Q${i}`, 'output', 65, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`R${i}`, 'output', 65, 15 + (bitWidth + i) * 16));
      pins.push(pin('ERR', 'output', 65, 15 + bitWidth * 2 * 16));
      return pins;
    }

    case 'COMPARATOR': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      pins.push(pin('A>B', 'output', 60, 15));
      pins.push(pin('A=B', 'output', 60, 35));
      pins.push(pin('A<B', 'output', 60, 55));
      return pins;
    }

    case 'ALU': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + (bitWidth + i) * 16));
      pins.push(pin('OP0', 'input', 0, 15 + bitWidth * 2 * 16));
      pins.push(pin('OP1', 'input', 0, 15 + (bitWidth * 2 + 1) * 16));
      pins.push(pin('OP2', 'input', 0, 15 + (bitWidth * 2 + 2) * 16));
      pins.push(pin('OP3', 'input', 0, 15 + (bitWidth * 2 + 3) * 16));
      pins.push(pin('Cin', 'input', 0, 15 + (bitWidth * 2 + 4) * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`F${i}`, 'output', 70, 15 + i * 16));
      pins.push(pin('Cout', 'output', 70, 15 + bitWidth * 16));
      pins.push(pin('ZERO', 'output', 70, 15 + (bitWidth + 1) * 16));
      pins.push(pin('OVR', 'output', 70, 15 + (bitWidth + 2) * 16));
      pins.push(pin('NEG', 'output', 70, 15 + (bitWidth + 3) * 16));
      return pins;
    }

    // ── Plexers & Code Converters ─────────────────────────────────────────
    case 'MULTIPLEXER': {
      const inCount = 1 << selBits;
      const H = Math.max(50, inCount * 18 + 20);
      const pins: Pin[] = [];
      for (let i = 0; i < inCount; i++) {
        pins.push(pin(`D${i}`, 'input', 0, Math.round(15 + i * ((H - 30) / Math.max(1, inCount - 1)))));
      }
      for (let i = 0; i < selBits; i++) {
        pins.push(pin(`S${i}`, 'input', Math.round(15 + i * 15), H));
      }
      pins.push(pin('Y', 'output', 50, Math.round(H / 2)));
      return pins;
    }

    case 'DEMULTIPLEXER': {
      const outCount = 1 << selBits;
      const H = Math.max(50, outCount * 18 + 20);
      const pins: Pin[] = [
        pin('A', 'input', 0, Math.round(H / 2)),
      ];
      for (let i = 0; i < selBits; i++) {
        pins.push(pin(`S${i}`, 'input', Math.round(15 + i * 15), H));
      }
      for (let i = 0; i < outCount; i++) {
        pins.push(pin(`Y${i}`, 'output', 50, Math.round(15 + i * ((H - 30) / Math.max(1, outCount - 1)))));
      }
      return pins;
    }

    case 'ENCODER': {
      const inCount = 1 << bitWidth;
      const H = Math.max(50, inCount * 16 + 20);
      const pins: Pin[] = [];
      for (let i = 0; i < inCount; i++) pins.push(pin(`D${i}`, 'input', 0, Math.round(15 + i * ((H - 30) / Math.max(1, inCount - 1)))));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Y${i}`, 'output', 50, Math.round(15 + i * ((H - 30) / Math.max(1, bitWidth - 1)))));
      return pins;
    }

    case 'PRIORITY_ENCODER': {
      const inCount = 1 << bitWidth;
      const H = Math.max(50, inCount * 16 + 20);
      const pins: Pin[] = [];
      for (let i = 0; i < inCount; i++) pins.push(pin(`D${i}`, 'input', 0, Math.round(15 + i * ((H - 30) / Math.max(1, inCount - 1)))));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Y${i}`, 'output', 50, Math.round(15 + i * ((H - 30) / Math.max(1, bitWidth - 1)))));
      pins.push(pin('ANY', 'output', 50, H - 10));
      return pins;
    }

    case 'DECODER': {
      const outCount = 1 << bitWidth;
      const H = Math.max(50, outCount * 16 + 20);
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`A${i}`, 'input', 0, Math.round(15 + i * ((H - 30) / Math.max(1, bitWidth - 1)))));
      pins.push(pin('EN', 'input', 25, H));
      for (let i = 0; i < outCount; i++) pins.push(pin(`Y${i}`, 'output', 50, Math.round(15 + i * ((H - 30) / Math.max(1, outCount - 1)))));
      return pins;
    }

    case 'BCD_TO_7SEG': {
      return [
        pin('D0', 'input', 0, 15),
        pin('D1', 'input', 0, 30),
        pin('D2', 'input', 0, 45),
        pin('D3', 'input', 0, 60),
        pin('LT', 'input', 25, 0), // Lamp Test
        pin('a', 'output', 55, 10),
        pin('b', 'output', 55, 20),
        pin('c', 'output', 55, 30),
        pin('d', 'output', 55, 40),
        pin('e', 'output', 55, 50),
        pin('f', 'output', 55, 60),
        pin('g', 'output', 55, 70),
      ];
    }

    case 'GRAY_ENCODER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`G${i}`, 'output', 50, 15 + i * 16));
      return pins;
    }

    case 'GRAY_DECODER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`G${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'output', 50, 15 + i * 16));
      return pins;
    }

    case 'BCD_ENCODER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'input', 0, 15 + i * 16));
      const bcdDigits = Math.ceil(bitWidth / 3);
      for (let d = 0; d < bcdDigits; d++) {
        for (let b = 0; b < 4; b++) {
          pins.push(pin(`BCD_${d}_${b}`, 'output', 60, 15 + (d * 4 + b) * 14));
        }
      }
      return pins;
    }

    case 'BCD_DECODER': {
      const pins: Pin[] = [];
      for (let i = 0; i < 8; i++) pins.push(pin(`BCD${i}`, 'input', 0, 15 + i * 14));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`B${i}`, 'output', 55, 15 + i * 16));
      return pins;
    }

    // ── Sequential & Memory ───────────────────────────────────────────────
    case 'SR_LATCH':
      return [
        pin('S', 'input', 0, 15),
        pin('R', 'input', 0, 35),
        pin('Q', 'output', 50, 15),
        pin('Q̅', 'output', 50, 35),
      ];

    case 'D_LATCH':
      return [
        pin('D', 'input', 0, 15),
        pin('EN', 'input', 0, 35),
        pin('Q', 'output', 50, 15),
        pin('Q̅', 'output', 50, 35),
      ];

    case 'SR_FLIPFLOP':
      return [
        pin('S', 'input', 0, 15),
        pin('CLK', 'input', 0, 30),
        pin('R', 'input', 0, 45),
        pin('RST', 'input', 25, 60),
        pin('PRE', 'input', 25, 0),
        pin('Q', 'output', 50, 15),
        pin('Q̅', 'output', 50, 45),
      ];

    case 'D_FLIPFLOP':
      return [
        pin('D', 'input', 0, 15),
        pin('CLK', 'input', 0, 30),
        pin('RST', 'input', 0, 45),
        pin('PRE', 'input', 25, 0),
        pin('Q', 'output', 50, 15),
        pin('Q̅', 'output', 50, 45),
      ];

    case 'JK_FLIPFLOP':
      return [
        pin('J', 'input', 0, 15),
        pin('CLK', 'input', 0, 30),
        pin('K', 'input', 0, 45),
        pin('Q', 'output', 50, 15),
        pin('Q̅', 'output', 50, 45),
      ];

    case 'T_FLIPFLOP':
      return [
        pin('T', 'input', 0, 15),
        pin('CLK', 'input', 0, 35),
        pin('Q', 'output', 50, 15),
        pin('Q̅', 'output', 50, 35),
      ];

    case 'REGISTER': {
      const pins: Pin[] = [];
      const H = Math.max(60, bitWidth * 16 + 40);
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`D${i}`, 'input', 0, 15 + i * 16));
      pins.push(pin('CLK', 'input', 0, H - 25));
      pins.push(pin('EN', 'input', 0, H - 10));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Q${i}`, 'output', 60, 15 + i * 16));
      return pins;
    }

    case 'SHIFT_REGISTER': {
      const pins: Pin[] = [];
      const H = Math.max(70, bitWidth * 16 + 50);
      pins.push(pin('SIN', 'input', 0, 15));
      pins.push(pin('LOAD', 'input', 0, 30));
      pins.push(pin('DIR', 'input', 0, 45));
      pins.push(pin('CLK', 'input', 0, 60));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`D${i}`, 'input', 20 + i * 10, H));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Q${i}`, 'output', 60, 15 + i * 16));
      pins.push(pin('SOUT', 'output', 60, 15 + bitWidth * 16));
      return pins;
    }

    case 'COUNTER': {
      const pins: Pin[] = [];
      pins.push(pin('CLK', 'input', 0, 15));
      pins.push(pin('EN', 'input', 0, 30));
      pins.push(pin('RST', 'input', 0, 45));
      pins.push(pin('UP', 'input', 0, 60));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Q${i}`, 'output', 60, 15 + i * 16));
      return pins;
    }

    case 'DECADE_COUNTER': {
      return [
        pin('CLK', 'input', 0, 15),
        pin('EN', 'input', 0, 30),
        pin('RST', 'input', 0, 45),
        pin('Q0', 'output', 55, 15),
        pin('Q1', 'output', 55, 30),
        pin('Q2', 'output', 55, 45),
        pin('Q3', 'output', 55, 60),
        pin('TC', 'output', 55, 75), // Terminal count = 9
      ];
    }

    case 'RING_COUNTER': {
      const pins: Pin[] = [];
      pins.push(pin('CLK', 'input', 0, 15));
      pins.push(pin('RST', 'input', 0, 30));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Q${i}`, 'output', 55, 15 + i * 16));
      return pins;
    }

    case 'JOHNSON_COUNTER': {
      const pins: Pin[] = [];
      pins.push(pin('CLK', 'input', 0, 15));
      pins.push(pin('RST', 'input', 0, 30));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`Q${i}`, 'output', 55, 15 + i * 16));
      return pins;
    }

    case 'REGISTER_FILE': {
      const pins: Pin[] = [];
      pins.push(pin('RA0', 'input', 0, 15));
      pins.push(pin('RA1', 'input', 0, 30));
      pins.push(pin('RB0', 'input', 0, 50));
      pins.push(pin('RB1', 'input', 0, 65));
      pins.push(pin('WA0', 'input', 0, 85));
      pins.push(pin('WA1', 'input', 0, 100));
      pins.push(pin('WE', 'input', 0, 120));
      pins.push(pin('CLK', 'input', 0, 135));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`WD${i}`, 'input', 0, 150 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`QA${i}`, 'output', 70, 15 + i * 16));
      for (let i = 0; i < bitWidth; i++) pins.push(pin(`QB${i}`, 'output', 70, 15 + (bitWidth + i) * 16));
      return pins;
    }

    case 'RAM': {
      const pins: Pin[] = [];
      for (let i = 0; i < addrWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      pins.push(pin('WE', 'input', 0, 15 + addrWidth * 16));
      pins.push(pin('OE', 'input', 0, 15 + (addrWidth + 1) * 16));
      for (let i = 0; i < dataWidth; i++) pins.push(pin(`D${i}`, 'input', 0, 15 + (addrWidth + 2 + i) * 16));
      pins.push(pin('CLK', 'input', 0, 15 + (addrWidth + 2 + dataWidth) * 16));
      for (let i = 0; i < dataWidth; i++) pins.push(pin(`Q${i}`, 'output', 70, 15 + i * 16));
      return pins;
    }

    case 'ROM': {
      const pins: Pin[] = [];
      for (let i = 0; i < addrWidth; i++) pins.push(pin(`A${i}`, 'input', 0, 15 + i * 16));
      for (let i = 0; i < dataWidth; i++) pins.push(pin(`Q${i}`, 'output', 60, 15 + i * 16));
      return pins;
    }

    case 'FIFO': {
      const pins: Pin[] = [];
      pins.push(pin('CLK', 'input', 0, 15));
      pins.push(pin('WE', 'input', 0, 30)); // Push
      pins.push(pin('RE', 'input', 0, 45)); // Pop
      pins.push(pin('RST', 'input', 0, 60));
      for (let i = 0; i < dataWidth; i++) pins.push(pin(`DIN${i}`, 'input', 0, 75 + i * 14));
      for (let i = 0; i < dataWidth; i++) pins.push(pin(`DOUT${i}`, 'output', 65, 15 + i * 14));
      pins.push(pin('EMPTY', 'output', 65, 15 + dataWidth * 14));
      pins.push(pin('FULL', 'output', 65, 15 + (dataWidth + 1) * 14));
      return pins;
    }

    case 'STACK':
    case 'LIFO': {
      const pins: Pin[] = [];
      pins.push(pin('CLK', 'input', 0, 15));
      pins.push(pin('PUSH', 'input', 0, 30));
      pins.push(pin('POP', 'input', 0, 45));
      pins.push(pin('RST', 'input', 0, 60));
      for (let i = 0; i < dataWidth; i++) pins.push(pin(`DIN${i}`, 'input', 0, 75 + i * 14));
      for (let i = 0; i < dataWidth; i++) pins.push(pin(`DOUT${i}`, 'output', 65, 15 + i * 14));
      pins.push(pin('EMPTY', 'output', 65, 15 + dataWidth * 14));
      pins.push(pin('FULL', 'output', 65, 15 + (dataWidth + 1) * 14));
      return pins;
    }

    // ── Wiring & Buses ────────────────────────────────────────────────────
    case 'SPLITTER': {
      const pins: Pin[] = [
        pin('IN', 'input', 0, 20, bitWidth),
      ];
      for (let i = 0; i < bitWidth; i++) {
        pins.push(pin(`O${i}`, 'output', 40, 10 + i * 16));
      }
      return pins;
    }

    case 'MERGER': {
      const pins: Pin[] = [];
      for (let i = 0; i < bitWidth; i++) {
        pins.push(pin(`I${i}`, 'input', 0, 10 + i * 16));
      }
      pins.push(pin('OUT', 'output', 40, 20, bitWidth));
      return pins;
    }

    case 'BIT_SELECTOR': {
      return [
        pin('IN', 'input', 0, 20, bitWidth),
        pin('OUT', 'output', 40, 20, 1),
      ];
    }

    case 'BUS_TAP': {
      return [
        pin('BUS_IN', 'input', 0, 20, bitWidth),
        pin('TAP_OUT', 'output', 40, 20, 1),
      ];
    }

    case 'TUNNEL':
      return [pin('NET', 'bidirectional', 20, 10)];

    case 'SUBCIRCUIT': {
      if (subcircuitRef) {
        const inputPins = subcircuitRef.components.filter(c => c.type === 'INPUT_PIN');
        const outputPins = subcircuitRef.components.filter(c => c.type === 'OUTPUT_PIN');
        const pins: Pin[] = [];
        inputPins.forEach((comp, idx) => {
          const bw = (comp.properties['bitWidth'] as number) ?? 1;
          const lbl = (comp.properties['label'] as string) || comp.label || `IN${idx}`;
          pins.push(pin(lbl, 'input', 0, 15 + idx * 20, bw));
        });
        outputPins.forEach((comp, idx) => {
          const bw = (comp.properties['bitWidth'] as number) ?? 1;
          const lbl = (comp.properties['label'] as string) || comp.label || `OUT${idx}`;
          pins.push(pin(lbl, 'output', 70, 15 + idx * 20, bw));
        });
        return pins;
      }
      return [
        pin('IN', 'input', 0, 20),
        pin('OUT', 'output', 70, 20),
      ];
    }

    // ── Multi-Input Gates ─────────────────────────────────────────────────
    default: {
      const pins: Pin[] = [];
      const totalH = Math.max(40, inputCount * 18 + 10);
      for (let i = 0; i < inputCount; i++) {
        const y = Math.round(15 + i * ((totalH - 30) / Math.max(1, inputCount - 1)));
        pins.push(pin(String.fromCharCode(65 + i), 'input', 0, y));
      }
      pins.push(pin('Y', 'output', 50, Math.round(totalH / 2)));
      return pins;
    }
  }
}

export function createComponent(
  type: string,
  x: number,
  y: number,
  initialProperties: Record<string, PropertyValue> = {},
  subcircuitRef?: Circuit
): CircuitComponent {
  const properties: Record<string, PropertyValue> = {
    ...(type === 'SWITCH' ? { isOn: false } : {}),
    ...(type === 'PUSH_BUTTON' ? { isPressed: false } : {}),
    ...(type === 'CLOCK' ? { frequency: 1, state: false } : {}),
    ...(type === 'CONSTANT' ? { value: 1 } : {}),
    ...(type === 'INPUT_PIN' || type === 'OUTPUT_PIN' || type === 'PROBE' ? { bitWidth: 1, radix: 'binary' } : {}),
    ...(type === 'RESULT_CONSTANT' ? { bitWidth: 4, value: 0 } : {}),
    ...(type === 'LED' ? { color: 'red', activeLow: false } : {}),
    ...(type === 'RGB_LED' ? {} : {}),
    ...(type === 'SEVEN_SEGMENT' || type === 'HEX_DISPLAY' ? {} : {}),
    ...(type === 'ADDER' || type === 'SUBTRACTOR' || type === 'ADDER_SUBTRACTOR' || type === 'CARRY_LOOKAHEAD_ADDER' || type === 'COMPARATOR' || type === 'ALU' || type === 'MULTIPLIER' || type === 'DIVIDER' || type === 'INCREMENTER' || type === 'DECREMENTER' || type === 'NEGATOR' ? { bitWidth: 4 } : {}),
    ...(type === 'REGISTER' || type === 'SHIFT_REGISTER' || type === 'COUNTER' || type === 'RING_COUNTER' || type === 'JOHNSON_COUNTER' ? { bitWidth: 4 } : {}),
    ...(type === 'GRAY_ENCODER' || type === 'GRAY_DECODER' || type === 'BCD_ENCODER' || type === 'BCD_DECODER' ? { bitWidth: 4 } : {}),
    ...(type === 'REGISTER_FILE' ? { bitWidth: 4, regCount: 4 } : {}),
    ...(type === 'MULTIPLEXER' || type === 'DEMULTIPLEXER' ? { selBits: 1 } : {}),
    ...(type === 'ENCODER' || type === 'PRIORITY_ENCODER' || type === 'DECODER' ? { bitWidth: 2 } : {}),
    ...(type === 'RAM' || type === 'ROM' ? { addrWidth: 4, dataWidth: 8 } : {}),
    ...(type === 'FIFO' || type === 'STACK' || type === 'LIFO' ? { dataWidth: 8, depth: 16 } : {}),
    ...(type === 'SPLITTER' || type === 'MERGER' || type === 'BUS_TAP' ? { bitWidth: 4, tapIndex: 0 } : {}),
    ...(['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'].includes(type) ? { inputCount: 2 } : {}),
    ...initialProperties,
  };

  const pins = createPins(type, properties, subcircuitRef);
  
  // Calculate dynamic dimensions based on pin bounds
  let width = 50;
  let height = 40;

  if (['CONSTANT', 'CONSTANT_0', 'CONSTANT_1', 'INPUT_PIN', 'OUTPUT_PIN'].includes(type)) {
    width = 40;
    height = 40;
  } else if (type === 'PROBE') {
    width = 65;
    height = 35;
  } else if (type === 'RESULT_CONSTANT') {
    const bitW = Math.max(1, Math.min(64, (properties.bitWidth as number) ?? 4));
    const pinSpacing = bitW > 32 ? 10 : bitW > 16 ? 12 : 16;
    width = bitW > 32 ? 90 : bitW > 16 ? 75 : 60;
    height = bitW === 1 ? 40 : Math.max(40, bitW * pinSpacing + 20);
  } else if (['HALF_ADDER', 'HALF_SUBTRACTOR', 'SR_LATCH', 'D_LATCH', 'T_FLIPFLOP'].includes(type)) {
    width = 50;
    height = 50;
  } else if (['FULL_ADDER', 'FULL_SUBTRACTOR', 'SR_FLIPFLOP', 'D_FLIPFLOP', 'JK_FLIPFLOP'].includes(type)) {
    width = 50;
    height = 60;
  } else if (['ADDER', 'SUBTRACTOR', 'ADDER_SUBTRACTOR', 'CARRY_LOOKAHEAD_ADDER', 'COMPARATOR', 'INCREMENTER', 'DECREMENTER', 'NEGATOR'].includes(type)) {
    width = 60;
    const bitW = (properties.bitWidth as number) ?? 4;
    height = Math.max(60, (bitW * 2 + 2) * 16 + 20);
  } else if (type === 'MULTIPLIER' || type === 'DIVIDER') {
    width = 65;
    const bitW = (properties.bitWidth as number) ?? 4;
    height = Math.max(65, (bitW * 2 + 2) * 16 + 20);
  } else if (type === 'ALU') {
    width = 70;
    const bitW = (properties.bitWidth as number) ?? 4;
    height = Math.max(70, bitW * 32 + 30);
  } else if (type === 'MULTIPLEXER' || type === 'DEMULTIPLEXER') {
    width = 50;
    const selB = (properties.selBits as number) ?? 1;
    height = Math.max(50, (1 << selB) * 18 + 20);
  } else if (type === 'ENCODER' || type === 'PRIORITY_ENCODER' || type === 'DECODER') {
    width = 50;
    const bitW = (properties.bitWidth as number) ?? 2;
    height = Math.max(50, (1 << bitW) * 16 + 20);
  } else if (type === 'BCD_TO_7SEG') {
    width = 55;
    height = 80;
  } else if (['GRAY_ENCODER', 'GRAY_DECODER', 'BCD_ENCODER', 'BCD_DECODER'].includes(type)) {
    width = 55;
    const bitW = (properties.bitWidth as number) ?? 4;
    height = Math.max(50, bitW * 16 + 20);
  } else if (type === 'REGISTER' || type === 'COUNTER' || type === 'RING_COUNTER' || type === 'JOHNSON_COUNTER') {
    width = 60;
    const bitW = (properties.bitWidth as number) ?? 4;
    height = Math.max(60, bitW * 16 + 40);
  } else if (type === 'DECADE_COUNTER') {
    width = 55;
    height = 85;
  } else if (type === 'SHIFT_REGISTER') {
    width = 60;
    const bitW = (properties.bitWidth as number) ?? 4;
    height = Math.max(70, bitW * 16 + 50);
  } else if (type === 'REGISTER_FILE') {
    width = 70;
    const bitW = (properties.bitWidth as number) ?? 4;
    height = Math.max(150, bitW * 32 + 40);
  } else if (type === 'RAM') {
    width = 70;
    const aW = (properties.addrWidth as number) ?? 4;
    const dW = (properties.dataWidth as number) ?? 8;
    height = Math.max(70, (aW + dW + 2) * 16 + 20);
  } else if (type === 'ROM') {
    width = 60;
    const aW = (properties.addrWidth as number) ?? 4;
    const dW = (properties.dataWidth as number) ?? 8;
    height = Math.max(60, Math.max(aW, dW) * 16 + 20);
  } else if (type === 'FIFO' || type === 'STACK' || type === 'LIFO') {
    width = 65;
    const dW = (properties.dataWidth as number) ?? 8;
    height = Math.max(80, dW * 14 + 40);
  } else if (type === 'LED') {
    width = 40;
    height = 40;
  } else if (type === 'RGB_LED') {
    width = 40;
    height = 50;
  } else if (type === 'LCD') {
    width = 90;
    height = 40;
  } else if (type === 'SEVEN_SEGMENT' || type === 'HEX_DISPLAY') {
    width = 50;
    height = 80;
  } else if (type === 'SPLITTER' || type === 'MERGER') {
    const bitW = (properties.bitWidth as number) ?? 4;
    width = 40;
    height = Math.max(40, bitW * 16 + 20);
  } else if (type === 'BIT_SELECTOR' || type === 'BUS_TAP') {
    width = 40;
    height = 40;
  } else if (type === 'SUBCIRCUIT') {
    width = 70;
    const inCount = pins.filter(p => p.direction === 'input').length;
    const outCount = pins.filter(p => p.direction === 'output').length;
    height = Math.max(50, Math.max(inCount, outCount) * 20 + 20);
  } else if (['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'].includes(type)) {
    const inC = (properties.inputCount as number) ?? 2;
    width = 50;
    height = Math.max(40, inC * 18 + 10);
  }

  return {
    id: nanoid(),
    type,
    category: categoryFor(type),
    name: type,
    transform: { x, y, scale: 1, rotation: 0 },
    pins,
    properties,
    bounds: { x: 0, y: 0, width, height },
    label: (initialProperties.label as string) ?? type,
  };
}

export function isValidWireConnection(components: CircuitComponent[], fromPinId: string, toPinId: string): boolean {
  if (fromPinId === toPinId) return false;
  const pins = components.flatMap(component => component.pins);
  const from = pins.find(pin => pin.id === fromPinId);
  const to = pins.find(pin => pin.id === toPinId);
  if (!from || !to) return false;

  const validDirections =
    (from.direction === 'output' || from.direction === 'bidirectional') &&
    (to.direction === 'input' || to.direction === 'bidirectional');

  return validDirections;
}
