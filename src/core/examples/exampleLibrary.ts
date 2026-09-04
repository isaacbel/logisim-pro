/**
 * Logisim Pro — Bundled Educational Example Project Library
 * Curated reference designs across Digital Logic, Boolean Algebra / K-Maps, and Intel 8086 Assembly.
 */

import { LogisimProProjectFile, createProjectFile } from '../project/projectFormat';
import type { Project, Circuit, SimulationState, CircuitComponent, Wire } from '@apptypes/core';
import { createComponent } from '@core/components/factory';

export interface ExampleCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  examples: ExampleItem[];
}

export interface ExampleItem {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description: string;
  tags: string[];
  projectGenerator: () => LogisimProProjectFile;
}

const DEFAULT_SIMULATION: SimulationState = {
  mode: 'paused',
  speed: 'normal',
  tick: 0,
  isRunning: false,
  propagationDelay: 1,
  detectedHazards: [],
  detectedOscillations: [],
};

function makeCircuit(id: string, name: string, components: CircuitComponent[] = [], wires: Wire[] = [], isMain = true): Circuit {
  return {
    id,
    name,
    components,
    wires,
    customComponents: [],
    simulationState: DEFAULT_SIMULATION,
    isMain,
  };
}

function makeProject(id: string, name: string, circuits: Circuit[]): Project {
  return {
    id,
    name,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    circuits,
    libraries: [],
    settings: {
      gridSize: 20,
      snapToGrid: true,
      showGrid: true,
      theme: 'dark',
      language: 'en',
      autosaveInterval: 60,
      propagationDelay: 1,
      wireStyle: 'orthogonal',
    },
  };
}

// ── Digital Logic Generators ──────────────────────────────────────────────────

function createHalfAdderProject(): LogisimProProjectFile {
  const inA = createComponent('INPUT_PIN', 100, 150, { label: 'A', bits: 1, defaultValue: 0 });
  const inB = createComponent('INPUT_PIN', 100, 250, { label: 'B', bits: 1, defaultValue: 0 });
  const gateXor = createComponent('XOR', 300, 180, { inputCount: 2, label: 'Sum (XOR)' });
  const gateAnd = createComponent('AND', 300, 280, { inputCount: 2, label: 'Carry (AND)' });
  const outSum = createComponent('OUTPUT_PIN', 500, 180, { label: 'SUM (S)', bits: 1 });
  const outCarry = createComponent('OUTPUT_PIN', 500, 280, { label: 'CARRY (C)', bits: 1 });

  const circuit = makeCircuit('c_half_adder', 'Half Adder', [inA, inB, gateXor, gateAnd, outSum, outCarry]);
  const project = makeProject('proj_half_adder', 'Half Adder Circuit', [circuit]);

  return createProjectFile(project, {
    description: 'A 1-bit Half Adder circuit computing Sum = A ^ B and Carry = A & B.',
    tags: ['arithmetic', 'adder', 'combinational'],
    course: 'Digital Electronics 101',
  });
}

function createFullAdderProject(): LogisimProProjectFile {
  const inA = createComponent('INPUT_PIN', 100, 120, { label: 'A', bits: 1 });
  const inB = createComponent('INPUT_PIN', 100, 200, { label: 'B', bits: 1 });
  const inCin = createComponent('INPUT_PIN', 100, 280, { label: 'Cin', bits: 1 });
  const xor1 = createComponent('XOR', 260, 150, { inputCount: 2 });
  const xor2 = createComponent('XOR', 420, 180, { inputCount: 2 });
  const and1 = createComponent('AND', 420, 280, { inputCount: 2 });
  const and2 = createComponent('AND', 260, 360, { inputCount: 2 });
  const or1 = createComponent('OR', 560, 320, { inputCount: 2 });
  const outSum = createComponent('OUTPUT_PIN', 680, 180, { label: 'SUM' });
  const outCout = createComponent('OUTPUT_PIN', 680, 320, { label: 'Cout' });

  const circuit = makeCircuit('c_full_adder', '1-Bit Full Adder', [
    inA, inB, inCin, xor1, xor2, and1, and2, or1, outSum, outCout
  ]);
  const project = makeProject('proj_full_adder', '1-Bit Full Adder with Carry-In', [circuit]);

  return createProjectFile(project, {
    description: 'Cascadable 1-bit full adder supporting Carry-in and Carry-out propagation.',
    tags: ['adder', 'arithmetic', 'full-adder'],
  });
}

function createMux4to1Project(): LogisimProProjectFile {
  const inD0 = createComponent('INPUT_PIN', 100, 100, { label: 'D0' });
  const inD1 = createComponent('INPUT_PIN', 100, 160, { label: 'D1' });
  const inD2 = createComponent('INPUT_PIN', 100, 220, { label: 'D2' });
  const inD3 = createComponent('INPUT_PIN', 100, 280, { label: 'D3' });
  const inS0 = createComponent('INPUT_PIN', 100, 360, { label: 'S0' });
  const inS1 = createComponent('INPUT_PIN', 100, 420, { label: 'S1' });
  const outY = createComponent('OUTPUT_PIN', 650, 200, { label: 'Y (Selected Out)' });

  const circuit = makeCircuit('c_mux_4to1', '4-to-1 Multiplexer', [
    inD0, inD1, inD2, inD3, inS0, inS1, outY
  ]);
  const project = makeProject('proj_mux4to1', '4-to-1 Multiplexer', [circuit]);

  return createProjectFile(project, {
    description: 'Selects one of 4 input signals based on 2-bit select code (S1, S0).',
    tags: ['multiplexer', 'mux', 'routing'],
  });
}

// ── Boolean & K-Map Project Generators ───────────────────────────────────────

function createKMap5VarExample(): LogisimProProjectFile {
  const circuit = makeCircuit('c_kmap5', '5-Variable Logic Synthesis');
  const project = makeProject('proj_kmap5_ex', '5-Variable Majority Function (K-Map)', [circuit]);

  return createProjectFile(project, {
    description: '5-variable minimization example over variables A, B, C, D, E using Gray-coded 4x8 matrix.',
    tags: ['boolean', 'k-map', '5-variable'],
  }, {
    booleanAlgebra: {
      expression: "A B C + B C D E + A' B' C D",
      variableCount: 5,
      kmapMinTerms: [3, 7, 11, 15, 19, 23, 27, 31],
      kmapDontCares: [0, 16],
    },
  });
}

// ── 8086 Assembly Project Generators ─────────────────────────────────────────

function create8086FibonacciProject(): LogisimProProjectFile {
  const circuit = makeCircuit('c_8086_fib', '8086 Fibonacci Program');
  const project = makeProject('proj_8086_fib', '8086 16-Bit Fibonacci Generator', [circuit]);

  const asmCode = `; ==========================================
; Program: 16-bit Fibonacci Generator
; Calculates F(0)..F(7) in registers & RAM
; ==========================================
.DATA
  FIB_ARRAY DW 8 DUP(0)

.CODE
  MOV AX, 0000H     ; F(0) = 0
  MOV BX, 0001H     ; F(1) = 1
  MOV CX, 0008H     ; Generate 8 numbers
  MOV SI, 0000H     ; Offset index

FIB_LOOP:
  MOV [SI], AX      ; Store current term in RAM
  MOV DX, AX        ; DX = AX
  ADD DX, BX        ; DX = AX + BX (Next term)
  MOV AX, BX        ; AX = F(n-1)
  MOV BX, DX        ; BX = F(n)
  ADD SI, 0002H     ; Next 16-bit word
  LOOP FIB_LOOP     ; Decrement CX, loop if CX != 0

  HLT               ; Halt CPU execution
`;

  return createProjectFile(project, {
    description: 'Calculates the first 8 Fibonacci numbers using 8086 registers and memory array.',
    tags: ['8086', 'assembly', 'fibonacci', 'registers'],
  }, {
    arch8086: {
      sourceCode: asmCode,
    },
  });
}

function create8086BubbleSortProject(): LogisimProProjectFile {
  const circuit = makeCircuit('c_8086_sort', '8086 Bubble Sort');
  const project = makeProject('proj_8086_sort', '8086 Array Bubble Sort', [circuit]);

  const asmCode = `; ==========================================
; Program: Bubble Sort on Word Array
; Sorts 5 numbers in ascending order
; ==========================================
.CODE
  MOV [0000H], 0055H
  MOV [0002H], 0012H
  MOV [0004H], 0088H
  MOV [0006H], 0004H
  MOV [0008H], 0033H

  MOV CX, 0004H     ; Outer loop counter (N-1)

OUTER_LOOP:
  MOV SI, 0000H     ; Inner index pointer
  MOV DX, CX        ; Inner counter

INNER_LOOP:
  MOV AX, [SI]      ; Load item A
  MOV BX, [SI+2]    ; Load item B
  CMP AX, BX        ; Compare A and B
  JBE NO_SWAP       ; If A <= B, no swap needed

  ; Swap elements in memory
  MOV [SI], BX
  MOV [SI+2], AX

NO_SWAP:
  ADD SI, 0002H     ; Advance to next pair
  DEC DX
  JNZ INNER_LOOP

  LOOP OUTER_LOOP

  HLT
`;

  return createProjectFile(project, {
    description: 'In-memory bubble sort sorting 5 elements in ascending numerical order.',
    tags: ['8086', 'assembly', 'algorithms', 'sorting'],
  }, {
    arch8086: {
      sourceCode: asmCode,
    },
  });
}

// ── Curated Library Catalog ──────────────────────────────────────────────────

export const BUNDLED_EXAMPLE_CATEGORIES: ExampleCategory[] = [
  {
    id: 'digital_logic',
    name: 'Digital Logic & Circuits',
    description: 'Fundamental combinational and sequential building blocks.',
    icon: 'Cpu',
    examples: [
      {
        id: 'ex_half_adder',
        title: '1-Bit Half Adder',
        category: 'digital_logic',
        difficulty: 'Beginner',
        description: 'Computes sum and carry using XOR and AND gates.',
        tags: ['Adder', 'Combinational', 'Basic'],
        projectGenerator: createHalfAdderProject,
      },
      {
        id: 'ex_full_adder',
        title: '1-Bit Full Adder',
        category: 'digital_logic',
        difficulty: 'Beginner',
        description: 'Complete adder cell with Carry-In and Carry-Out signals.',
        tags: ['Adder', 'Arithmetic', 'Carry'],
        projectGenerator: createFullAdderProject,
      },
      {
        id: 'ex_mux_4to1',
        title: '4-to-1 Multiplexer (MUX)',
        category: 'digital_logic',
        difficulty: 'Intermediate',
        description: 'Selects 1 of 4 inputs using 2 address selector lines.',
        tags: ['MUX', 'Routing', 'Selectors'],
        projectGenerator: createMux4to1Project,
      },
    ],
  },
  {
    id: 'boolean_algebra',
    name: 'Boolean Algebra & K-Maps',
    description: 'Truth tables, Gray-code minimization, and synthesis.',
    icon: 'Grid',
    examples: [
      {
        id: 'ex_kmap_5var',
        title: '5-Variable Majority Function (K-Map)',
        category: 'boolean_algebra',
        difficulty: 'Advanced',
        description: 'Simplifies a 5-input boolean function using two 4x4 sub-cubes.',
        tags: ['K-Map', '5-Variable', 'Gray Code'],
        projectGenerator: createKMap5VarExample,
      },
    ],
  },
  {
    id: '8086_assembly',
    name: 'Intel 8086 Architecture & Programs',
    description: 'Authentic 8086 microprocessor assembly programs.',
    icon: 'Terminal',
    examples: [
      {
        id: 'ex_8086_fibonacci',
        title: 'Fibonacci Sequence Generator (16-bit)',
        category: '8086_assembly',
        difficulty: 'Intermediate',
        description: 'Generates Fibonacci terms in registers and stores them into RAM.',
        tags: ['8086', 'Loops', 'Registers', 'Memory'],
        projectGenerator: create8086FibonacciProject,
      },
      {
        id: 'ex_8086_bubble_sort',
        title: 'Bubble Sort Algorithm (In-Place)',
        category: '8086_assembly',
        difficulty: 'Advanced',
        description: 'Sorts an array of 5 words in ascending numerical order.',
        tags: ['8086', 'Algorithms', 'Nested Loops', 'Pointers'],
        projectGenerator: create8086BubbleSortProject,
      },
    ],
  },
];
