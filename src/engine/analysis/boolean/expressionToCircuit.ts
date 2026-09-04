/**
 * Synthesizes Real Logisim Pro Circuit Components & Wires from Boolean AST / Expressions.
 * Creates genuine CircuitComponent and Wire instances directly usable in Logisim canvas.
 */

import { nanoid } from 'nanoid';
import type { CircuitComponent, Wire, WireSegment } from '@apptypes/core';
import { createComponent } from '@core/components/factory';
import { getPinWorldPosition } from '@utils/math';
import { routeWire } from '@engine/routing/wireRouter';
import { ASTNode, extractVariables } from './ast';
import { parseBooleanExpression } from './parser';
import { quineMcCluskey } from './quineMcCluskey';
import { generateTruthTable } from './truthTable';

export interface SynthesizedCircuit {
  components: CircuitComponent[];
  wires: Wire[];
  bounds: { x: number; y: number; width: number; height: number };
}

export function synthesizeCircuitFromExpression(
  input: ASTNode | string,
  mode: 'standard' | 'all-nand' | 'all-nor' = 'standard',
  startX = 120,
  startY = 100,
  gridSize = 20
): SynthesizedCircuit {
  const ast: ASTNode = typeof input === 'string' ? parseBooleanExpression(input) : input;
  const variables = extractVariables(ast);

  if (variables.length === 0) {
    // Constant 0 or 1
    const compType = ast.type === 'CONST' && ast.value === 1 ? 'CONSTANT_1' : 'CONSTANT_0';
    const constComp = createComponent(compType, startX, startY, { label: 'CONST' });
    const outComp = createComponent('OUTPUT_PIN', startX + 120, startY, { label: 'F' });
    const pFrom = constComp.pins.find(p => p.direction === 'output')!;
    const pTo = outComp.pins.find(p => p.direction === 'input')!;
    const wire = buildRoutedWire(constComp, pFrom.id, outComp, pTo.id, gridSize);
    return {
      components: [constComp, outComp],
      wires: [wire],
      bounds: { x: startX, y: startY, width: 200, height: 80 },
    };
  }

  // Derive minimal SOP / POS terms
  const table = generateTruthTable(ast, variables);
  const qm = quineMcCluskey(table.minterms, [], variables);
  const terms = qm.minimalSolutions[0]?.terms ?? [];

  const components: CircuitComponent[] = [];
  const wires: Wire[] = [];

  const snap = (v: number) => Math.round(v / gridSize) * gridSize;

  // ── Column 1: Input Pins (A, B, C...) ─────────────────────────────────────
  const inputComps = new Map<string, CircuitComponent>();
  const inputSpacing = Math.max(60, snap(80));

  variables.forEach((v, idx) => {
    const x = snap(startX);
    const y = snap(startY + idx * inputSpacing);
    const comp = createComponent('INPUT_PIN', x, y, { label: v, mode: 'toggle', value: 0 });
    inputComps.set(v, comp);
    components.push(comp);
  });

  // ── Column 2: Inverters (for variables that appear inverted) ───────────────
  const inverterComps = new Map<string, CircuitComponent>();
  const neededInversions = new Set<string>();

  for (const t of terms) {
    const lits = t.match(/[A-Z]'?/g) ?? [];
    lits.forEach(l => {
      if (l.endsWith("'")) neededInversions.add(l[0]);
    });
  }

  const inverterColX = snap(startX + 140);
  variables.forEach(v => {
    if (neededInversions.has(v)) {
      const parentInput = inputComps.get(v)!;
      const invY = snap(parentInput.transform.y);
      const isUniv = mode === 'all-nand' || mode === 'all-nor';
      const notComp = createComponent(
        mode === 'all-nand' ? 'NAND' : mode === 'all-nor' ? 'NOR' : 'NOT',
        inverterColX,
        invY,
        { label: `${v}'`, inputCount: isUniv ? 2 : 1 }
      );
      inverterComps.set(v, notComp);
      components.push(notComp);

      // Wire from input pin to inverter input(s)
      const pFrom = parentInput.pins.find(p => p.direction === 'output')!;
      const inputPins = notComp.pins.filter(p => p.direction === 'input');
      inputPins.forEach(pTo => {
        wires.push(buildRoutedWire(parentInput, pFrom.id, notComp, pTo.id, gridSize));
      });
    }
  });

  // ── Column 3: Product / Gate Stage (AND / NAND / NOR) ─────────────────────
  const gateColX = snap(startX + (neededInversions.size > 0 ? 300 : 180));
  const productComps: CircuitComponent[] = [];
  const gateSpacing = Math.max(70, snap(80));

  const effectiveTerms = terms.length > 0 ? terms : ['0'];

  effectiveTerms.forEach((term, idx) => {
    const lits = term.match(/[A-Z]'?/g) ?? [];
    const gateY = snap(startY + idx * gateSpacing);
    const isSingle = lits.length === 1;

    let gateType: string;
    let inputCount: number;

    if (mode === 'all-nand') {
      gateType = 'NAND';
      inputCount = isSingle ? 2 : lits.length;
    } else if (mode === 'all-nor') {
      gateType = 'NOR';
      inputCount = isSingle ? 2 : lits.length;
    } else {
      gateType = isSingle ? 'BUFFER' : 'AND';
      inputCount = isSingle ? 1 : lits.length;
    }

    const gateComp = createComponent(gateType, gateColX, gateY, { inputCount, label: term });
    productComps.push(gateComp);
    components.push(gateComp);

    // Connect inputs to product gate
    if (isSingle && (mode === 'all-nand' || mode === 'all-nor')) {
      // Invert single literal through NAND/NOR gate with both inputs tied
      const lit = lits[0];
      const isNegated = lit.endsWith("'");
      const varName = isNegated ? lit[0] : lit;
      const sourceComp = isNegated ? inverterComps.get(varName) : inputComps.get(varName);
      if (sourceComp) {
        const pFrom = sourceComp.pins.find(p => p.direction === 'output');
        const inPins = gateComp.pins.filter(p => p.direction === 'input');
        inPins.forEach(pTo => {
          if (pFrom) wires.push(buildRoutedWire(sourceComp, pFrom.id, gateComp, pTo.id, gridSize));
        });
      }
    } else {
      lits.forEach((lit, pinIdx) => {
        const isNegated = lit.endsWith("'");
        const varName = isNegated ? lit[0] : lit;
        const sourceComp = isNegated ? inverterComps.get(varName) : inputComps.get(varName);

        if (sourceComp) {
          const pFrom = sourceComp.pins.find(p => p.direction === 'output');
          const pTo = gateComp.pins.filter(p => p.direction === 'input')[pinIdx];
          if (pFrom && pTo) {
            wires.push(buildRoutedWire(sourceComp, pFrom.id, gateComp, pTo.id, gridSize));
          }
        }
      });
    }
  });

  // ── Column 4: Final Output Gate & Output Pin ──────────────────────────────
  const outGateColX = snap(gateColX + 160);
  const midGateY = snap(startY + ((effectiveTerms.length - 1) * gateSpacing) / 2);

  if (effectiveTerms.length > 1) {
    const finalGateType = mode === 'all-nand' ? 'NAND' : mode === 'all-nor' ? 'NOR' : 'OR';
    const finalGate = createComponent(finalGateType, outGateColX, midGateY, {
      inputCount: effectiveTerms.length,
      label: 'OUT_SUM',
    });
    components.push(finalGate);

    // Wire from each product gate to the final OR/NAND gate
    productComps.forEach((pComp, idx) => {
      const pFrom = pComp.pins.find(p => p.direction === 'output');
      const pTo = finalGate.pins.filter(p => p.direction === 'input')[idx];
      if (pFrom && pTo) {
        wires.push(buildRoutedWire(pComp, pFrom.id, finalGate, pTo.id, gridSize));
      }
    });

    // Final Output Pin
    const finalPinX = snap(outGateColX + 140);
    const outPin = createComponent('OUTPUT_PIN', finalPinX, midGateY, { label: 'F' });
    components.push(outPin);

    const pFrom = finalGate.pins.find(p => p.direction === 'output');
    const pTo = outPin.pins.find(p => p.direction === 'input');
    if (pFrom && pTo) {
      wires.push(buildRoutedWire(finalGate, pFrom.id, outPin, pTo.id, gridSize));
    }
  } else {
    // Single product or single gate directly to output
    const singleGate = productComps[0];
    const finalPinX = snap(outGateColX + 100);
    const outPin = createComponent('OUTPUT_PIN', finalPinX, midGateY, { label: 'F' });
    components.push(outPin);

    if (singleGate) {
      const pFrom = singleGate.pins.find(p => p.direction === 'output');
      const pTo = outPin.pins.find(p => p.direction === 'input');
      if (pFrom && pTo) {
        wires.push(buildRoutedWire(singleGate, pFrom.id, outPin, pTo.id, gridSize));
      }
    }
  }

  // Calculate total bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  components.forEach(c => {
    minX = Math.min(minX, c.transform.x);
    minY = Math.min(minY, c.transform.y);
    maxX = Math.max(maxX, c.transform.x + c.bounds.width);
    maxY = Math.max(maxY, c.transform.y + c.bounds.height);
  });

  return {
    components,
    wires,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  };
}

function buildRoutedWire(
  fromComp: CircuitComponent,
  fromPinId: string,
  toComp: CircuitComponent,
  toPinId: string,
  gridSize: number
): Wire {
  const pFrom = fromComp.pins.find(p => p.id === fromPinId)!;
  const pTo = toComp.pins.find(p => p.id === toPinId)!;
  const posFrom = getPinWorldPosition(fromComp, pFrom);
  const posTo = getPinWorldPosition(toComp, pTo);

  const segments: WireSegment[] = routeWire(posFrom, posTo, 'horizontal-first', gridSize);

  return {
    id: nanoid(),
    fromPinId,
    toPinId,
    bitWidth: 1,
    isBus: false,
    currentValue: 0,
    junctions: [],
    routingMode: 'horizontal-first',
    segments,
  };
}
