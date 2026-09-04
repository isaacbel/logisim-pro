import { useState, useMemo } from 'react';
import { useAppStore } from '@state/store';
import {
  parseBooleanExpression,
  astToString,
  generateTruthTable,
  buildCanonicalSOP,
  buildCanonicalPOS,
  simplifyStepByStep,
  optimizeExpression,
  synthesizeCircuitFromExpression,
  classifyBooleanFunction,
  detectXorStructure,
  analyzeHazards,
  analyzeExpressionTiming,
  compareImplementationDepths,
} from '@engine/analysis/boolean';
import {
  createKMapStructure,
  solveOptimalKMapGroups,
  CellValue,
  kmapToSvgString,
} from '@engine/analysis/karnaugh';
import {
  analyzeRealCircuit,
} from '@engine/analysis/validation';
import {
  SmartExpressionEditor,
  VisualExpressionBuilder,
  QMCVisualizer,
  ComparePanel,
  FunctionClassifierPanel,
  HazardPanel,
  PropagationPanel,
  FunctionLibraryPanel,
  ExerciseGenerator,
} from '../components/boolean';
import {
  Cpu,
  GitFork,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Download,
  Zap,
  BookOpen,
  Trophy,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Award,
  Layers,
} from 'lucide-react';

type BottomTab =
  | 'proof'
  | 'qmc'
  | 'compare'
  | 'logigram'
  | 'classifier'
  | 'hazards'
  | 'propagation'
  | 'library'
  | 'exercises'
  | 'gates';

// ── 8 Basic Logic Gates Explorer Data ───────────────────────────────────────
interface GateDefinition {
  type: string;
  name: string;
  symbol: string;
  formula: string;
  description: string;
  inputs: number;
  fn: (a: 0 | 1, b: 0 | 1) => 0 | 1;
}

const GATES_DATA: GateDefinition[] = [
  { type: 'BUFFER', name: 'OUI (Buffer)', symbol: 'S = A', formula: 'S = A', description: 'Transmet le signal sans modification (amplification/isolation).', inputs: 1, fn: a => a },
  { type: 'NOT', name: 'NON (NOT / Inverseur)', symbol: 'S = A̅', formula: "S = A'", description: "Inverse l'état logique : 1 devient 0, 0 devient 1.", inputs: 1, fn: a => (a === 1 ? 0 : 1) },
  { type: 'AND', name: 'ET (AND)', symbol: 'S = A·B', formula: 'S = A·B', description: 'Sortie à 1 uniquement si TOUTES les entrées sont à 1.', inputs: 2, fn: (a, b) => (a === 1 && b === 1 ? 1 : 0) },
  { type: 'OR', name: 'OU (OR)', symbol: 'S = A+B', formula: 'S = A+B', description: "Sortie à 1 si AU MOINS UNE des entrées est à 1.", inputs: 2, fn: (a, b) => (a === 1 || b === 1 ? 1 : 0) },
  { type: 'XOR', name: 'OU Exclusif (XOR)', symbol: 'S = A⊕B', formula: 'S = A ⊕ B', description: 'Sortie à 1 si EXACTEMENT UNE entrée est à 1 (parité impaire).', inputs: 2, fn: (a, b) => (a !== b ? 1 : 0) },
  { type: 'NAND', name: 'NON-ET (NAND)', symbol: 'S = (A·B)̅', formula: "S = (A·B)'", description: 'Porte universelle. Sortie à 0 uniquement si toutes les entrées sont à 1.', inputs: 2, fn: (a, b) => (a === 1 && b === 1 ? 0 : 1) },
  { type: 'NOR', name: 'NON-OU (NOR)', symbol: 'S = (A+B)̅', formula: "S = (A+B)'", description: 'Porte universelle. Sortie à 1 uniquement si toutes les entrées sont à 0.', inputs: 2, fn: (a, b) => (a === 0 && b === 0 ? 1 : 0) },
  { type: 'XNOR', name: 'NON-OU Exclusif (XNOR)', symbol: 'S = (A⊕B)̅', formula: "S = (A ⊕ B)'", description: "Détecteur d'égalité : Sortie à 1 si les entrées ont la même valeur.", inputs: 2, fn: (a, b) => (a === b ? 1 : 0) },
];

export function BooleanAlgebra() {
  const [expressionInput, setExpressionInput] = useState<string>("A.B + A'.C + B.C");
  const [kmapNumVars, setKmapNumVars] = useState<2 | 3 | 4 | 5 | 6>(3);
  const [kmapMode, setKmapMode] = useState<'sop' | 'pos'>('sop');
  const [kmapGridState, setKmapGridState] = useState<Record<number, CellValue>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [logigramMode, setLogigramMode] = useState<'standard' | 'all-nand' | 'all-nor'>('standard');
  const [copied, setCopied] = useState(false);
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('proof');

  // Gate Explorer state
  const [selectedGate, setSelectedGate] = useState<GateDefinition>(GATES_DATA[2]); // AND
  const [gateInA, setGateInA] = useState<0 | 1>(1);
  const [gateInB, setGateInB] = useState<0 | 1>(0);

  const { importGeneratedCircuit, project, currentCircuitId } = useAppStore();

  // ── Core Boolean Analysis Pipeline ────────────────────────────────────────
  const analysis = useMemo(() => {
    try {
      const ast = parseBooleanExpression(expressionInput);
      const variables = ast ? Array.from(new Set(astToString(ast).match(/[A-Z]/g) ?? ['A'])).sort() : ['A', 'B'];
      const table = generateTruthTable(ast, variables);
      const sop = buildCanonicalSOP(table.minterms, variables);
      const pos = buildCanonicalPOS(table.maxterms, variables);
      const trace = simplifyStepByStep(ast);

      const optimizedSOP = optimizeExpression(ast, 'minimal-sop');
      const optimizedPOS = optimizeExpression(ast, 'minimal-pos');
      const optimizedNAND = optimizeExpression(ast, 'all-nand');
      const optimizedNOR = optimizeExpression(ast, 'all-nor');
      const optimizedXOR = optimizeExpression(ast, 'xor-optimized');

      const classification = classifyBooleanFunction(table.minterms, variables);
      const xorAnalysis = detectXorStructure(table.minterms, variables);

      const sopTerms = trace.simplifiedExpression ? trace.simplifiedExpression.split('+').map(t => t.trim()) : [];
      const hazardResult = analyzeHazards(table.minterms, sopTerms, variables);

      const timing = analyzeExpressionTiming(ast);
      const depths = compareImplementationDepths(
        optimizedSOP.expression,
        optimizedNAND.expression,
        optimizedNOR.expression
      );

      return {
        ast,
        variables,
        table,
        sop,
        pos,
        trace,
        optimizedSOP,
        optimizedPOS,
        optimizedNAND,
        optimizedNOR,
        optimizedXOR,
        classification,
        xorAnalysis,
        hazardResult,
        timing,
        depths,
        error: null,
      };
    } catch (err) {
      return {
        ast: null,
        variables: ['A', 'B'],
        table: null,
        sop: null,
        pos: null,
        trace: null,
        optimizedSOP: null,
        optimizedPOS: null,
        optimizedNAND: null,
        optimizedNOR: null,
        optimizedXOR: null,
        classification: null,
        xorAnalysis: null,
        hazardResult: null,
        timing: null,
        depths: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, [expressionInput]);

  // ── Karnaugh Map Structure & Solver ───────────────────────────────────────
  const kmapStructure = useMemo(() => {
    const vars = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, kmapNumVars);
    const minterms: number[] = [];
    const dontCares: number[] = [];

    const total = 1 << kmapNumVars;
    for (let m = 0; m < total; m++) {
      const val = kmapGridState[m];
      if (val === 1) minterms.push(m);
      else if (val === 'X') dontCares.push(m);
      else if (val === undefined && analysis.table && analysis.variables.length === kmapNumVars) {
        if (analysis.table.minterms.includes(m)) minterms.push(m);
      }
    }

    return createKMapStructure(vars, minterms, dontCares);
  }, [kmapNumVars, kmapGridState, analysis.table, analysis.variables]);

  const kmapSolution = useMemo(() => {
    return solveOptimalKMapGroups(kmapStructure, kmapMode);
  }, [kmapStructure, kmapMode]);

  // ── Synthesized Circuit for Logigram & Canvas ─────────────────────────────
  const synthesizedCircuit = useMemo(() => {
    try {
      const targetExpr = analysis.trace?.simplifiedExpression || expressionInput;
      return synthesizeCircuitFromExpression(targetExpr, logigramMode, 100, 80, 20);
    } catch {
      return null;
    }
  }, [analysis.trace?.simplifiedExpression, expressionInput, logigramMode]);

  // ── Multi-Solution Comparison Entries ─────────────────────────────────────
  const compareSolutions = useMemo(() => {
    if (!analysis.trace) return [];
    return [
      {
        id: 'original',
        name: 'Originale saisie',
        expression: expressionInput,
        gates: analysis.timing?.gateDepth ?? 1,
        literals: (expressionInput.match(/[A-Z]/g) ?? []).length,
        terms: expressionInput.split('+').length,
        depth: analysis.timing?.gateDepth ?? 1,
        description: "Forme saisie par l'utilisateur",
      },
      {
        id: 'algebraic',
        name: 'Simplifiée Algébrique',
        expression: analysis.trace.simplifiedExpression,
        gates: analysis.optimizedSOP?.gateCount ?? 1,
        literals: analysis.optimizedSOP?.literalCount ?? 1,
        terms: analysis.trace.simplifiedExpression.split('+').length,
        depth: analysis.optimizedSOP?.depth ?? 1,
        description: 'Forme issue des 12 lois algébriques',
      },
      {
        id: 'kmap',
        name: `Karnaugh (${kmapMode.toUpperCase()})`,
        expression: kmapSolution.simplifiedExpression,
        gates: kmapSolution.selectedGroups.length,
        literals: kmapSolution.allMinimalSolutions[0]?.literalCount ?? 1,
        terms: kmapSolution.selectedGroups.length,
        depth: 2,
        description: 'Forme optimale déduite du tableau de Karnaugh',
      },
      {
        id: 'nand',
        name: 'Tout-NAND',
        expression: analysis.optimizedNAND?.expression ?? '',
        gates: analysis.optimizedNAND?.gateCount ?? 1,
        literals: analysis.optimizedNAND?.literalCount ?? 1,
        terms: analysis.optimizedNAND?.termCount ?? 1,
        depth: analysis.depths?.nand ?? 2,
        description: 'Synthèse universelle 2 niveaux NAND',
      },
      {
        id: 'nor',
        name: 'Tout-NOR',
        expression: analysis.optimizedNOR?.expression ?? '',
        gates: analysis.optimizedNOR?.gateCount ?? 1,
        literals: analysis.optimizedNOR?.literalCount ?? 1,
        terms: analysis.optimizedNOR?.termCount ?? 1,
        depth: analysis.depths?.nor ?? 2,
        description: 'Synthèse universelle 2 niveaux NOR',
      },
    ];
  }, [analysis, expressionInput, kmapSolution, kmapMode]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(expressionInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportToSimulator = () => {
    if (!synthesizedCircuit) return;
    importGeneratedCircuit(synthesizedCircuit.components, synthesizedCircuit.wires);
  };

  const handleAnalyzeCanvasCircuit = () => {
    const circuit = project?.circuits.find(c => c.id === currentCircuitId);
    if (!circuit || circuit.components.length === 0) {
      alert("Le circuit actuel est vide. Placez des composants sur le canvas avant d'analyser.");
      return;
    }

    const result = analyzeRealCircuit(circuit.components, circuit.wires);
    if (!result.truthTable) {
      alert("Impossible d'analyser le circuit : placez au moins une entrée (Input Pin / Switch) et une sortie (Output Pin / LED).");
      return;
    }

    const vars = result.truthTable.variables;
    const sop = buildCanonicalSOP(result.truthTable.minterms, vars);
    setExpressionInput(sop.expandedSOP || '0');
  };

  const toggleKMapCell = (minterm: number) => {
    setKmapGridState(prev => {
      const curr = prev[minterm] ?? (analysis.table?.minterms.includes(minterm) ? 1 : 0);
      const next: CellValue = curr === 0 ? 1 : curr === 1 ? 'X' : 0;
      return { ...prev, [minterm]: next };
    });
  };

  const exportKMapSvg = () => {
    const svg = kmapToSvgString(kmapStructure, kmapSolution.selectedGroups);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kmap.svg'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── TOP HEADER & ACTIONS ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Cpu size={22} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Algèbre de Boole &amp; Laboratoire Karnaugh Pro
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Espace de conception numérique complet : simplification algébrique, Quine-McCluskey, K-maps toroïdaux, analyse d'aléas et synthèse réelle.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowVisualBuilder(s => !s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: showVisualBuilder ? 'var(--accent)' : 'var(--surface-1)',
              color: showVisualBuilder ? '#fff' : 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} />
            <span>Constructeur Visuel</span>
          </button>

          <button
            id="btn-analyze-canvas"
            onClick={handleAnalyzeCanvasCircuit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(139,92,246,0.35)',
              background: 'rgba(139,92,246,0.12)',
              color: '#a78bfa',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Exécute les 2^N combinaisons sur le vrai circuit Logisim Pro et extrait sa table de vérité"
          >
            <Zap size={14} />
            <span>Analyser le circuit Logisim actuel</span>
          </button>
        </div>
      </div>

      {/* ── SMART EXPRESSION EDITOR & OPTIONAL VISUAL BUILDER ─────────────── */}
      <SmartExpressionEditor
        value={expressionInput}
        onChange={setExpressionInput}
        copied={copied}
        onCopy={handleCopy}
      />

      {showVisualBuilder && (
        <VisualExpressionBuilder
          onApplyExpression={setExpressionInput}
        />
      )}

      {/* ── PERSISTENT SPLIT-PANEL: TRUTH TABLE (LEFT) + K-MAP (RIGHT) ────── */}
      {analysis.table && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
          {/* Left Column: Truth Table */}
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Table de Vérité ({analysis.table.rowCount} lignes)
              </div>
              <button
                onClick={() => {
                  if (!analysis.table) return;
                  const csv = analysis.table.rows.map(r => [...analysis.variables.map(v => r.inputs[v]), r.output].join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'truth_table.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                <Download size={12} /> CSV
              </button>
            </div>

            {/* Sticky Table Scrollbox */}
            <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>#</th>
                    {analysis.variables.map(v => (
                      <th key={v} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        {v}
                      </th>
                    ))}
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--accent)' }}>F</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.table.rows.map(r => (
                    <tr key={r.index} style={{ borderBottom: '1px solid var(--border)', background: r.output ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>m{r.index}</td>
                      {analysis.variables.map(v => (
                        <td key={v} style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 600 }}>{r.inputs[v]}</td>
                      ))}
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 800, color: r.output ? '#10b981' : 'var(--text-muted)' }}>
                        {r.output}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Minterms & Maxterms Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#10b981' }}>Mintermes :</strong> {analysis.sop?.sigmaNotation}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#f59e0b' }}>Maxtermes :</strong> {analysis.pos?.piNotation}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Karnaugh Map */}
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {/* Variable Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Variables :</span>
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => { setKmapNumVars(n as 2 | 3 | 4 | 5 | 6); setKmapGridState({}); setSelectedGroupId(null); }}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 5,
                      border: `1px solid ${kmapNumVars === n ? 'var(--accent)' : 'var(--border)'}`,
                      background: kmapNumVars === n ? 'var(--accent)' : 'var(--surface-2)',
                      color: kmapNumVars === n ? '#fff' : 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {n} vars ({n === 2 ? '2×2' : n === 3 ? '2×4' : n === 4 ? '4×4' : n === 5 ? '2×(4×4)' : '4×(4×4)'})
                  </button>
                ))}
              </div>

              {/* Mode Toggle: SOP vs POS */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setKmapMode('sop')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 5,
                    border: `1px solid ${kmapMode === 'sop' ? '#10b981' : 'var(--border)'}`,
                    background: kmapMode === 'sop' ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                    color: kmapMode === 'sop' ? '#10b981' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  SOP (Groupes de 1)
                </button>
                <button
                  onClick={() => setKmapMode('pos')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 5,
                    border: `1px solid ${kmapMode === 'pos' ? '#8b5cf6' : 'var(--border)'}`,
                    background: kmapMode === 'pos' ? 'rgba(139,92,246,0.15)' : 'var(--surface-2)',
                    color: kmapMode === 'pos' ? '#8b5cf6' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  POS (Groupes de 0)
                </button>
              </div>

              {/* Export SVG */}
              <button
                onClick={exportKMapSvg}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <Download size={11} /> Exporter SVG
              </button>
            </div>

            {/* Multi-Plane Grid Layout (1 plane for 2..4, 2 planes for 5, 4 planes for 6) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: kmapStructure.numPlanes === 1 ? '1fr' : kmapStructure.numPlanes === 2 ? '1fr 1fr' : '1fr 1fr',
              gap: 16,
              overflowX: 'auto',
              padding: '4px 0',
            }}>
              {kmapStructure.planes.map((plane, pIdx) => (
                <div
                  key={pIdx}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {plane.planeHeader && (
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#cba6f7', padding: '2px 8px', borderRadius: 4, background: 'rgba(203,166,247,0.12)' }}>
                      Plan {plane.planeHeader}
                    </div>
                  )}

                  <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '4px 8px', color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>
                          {kmapStructure.rowVarNames.join('')} \ {kmapStructure.colVarNames.join('')}
                        </th>
                        {kmapStructure.colHeaders.map((ch, ci) => (
                          <th key={ci} style={{ padding: '4px 12px', color: 'var(--accent)', fontSize: 11, fontWeight: 700, textAlign: 'center', borderBottom: '2px solid var(--border)' }}>
                            {ch}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plane.grid.map((row, ri) => (
                        <tr key={ri}>
                          <td style={{ padding: '6px 8px', color: 'var(--accent)', fontSize: 11, fontWeight: 700, textAlign: 'center', borderRight: '2px solid var(--border)' }}>
                            {kmapStructure.rowHeaders[ri]}
                          </td>
                          {row.map(cell => {
                            const isTarget = cell.value === (kmapMode === 'sop' ? 1 : 0);
                            const isX = cell.value === 'X';

                            const activeGroups = kmapSolution.selectedGroups.filter(g => g.minterms.includes(cell.minterm));
                            const isSelectedGroupCell = selectedGroupId
                              ? activeGroups.some(g => g.id === selectedGroupId)
                              : false;
                            const primaryColor = activeGroups[0]?.color;

                            return (
                              <td
                                key={cell.col}
                                onClick={() => toggleKMapCell(cell.minterm)}
                                style={{
                                  width: kmapNumVars >= 5 ? 46 : 56,
                                  height: kmapNumVars >= 5 ? 40 : 46,
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  border: isSelectedGroupCell ? '2px solid #fff' : '1px solid var(--border)',
                                  background: isSelectedGroupCell
                                    ? (primaryColor ? `${primaryColor}50` : 'rgba(255,255,255,0.2)')
                                    : primaryColor
                                    ? `${primaryColor}25`
                                    : isTarget
                                    ? (kmapMode === 'sop' ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)')
                                    : isX
                                    ? 'rgba(245,158,11,0.12)'
                                    : 'var(--surface-1)',
                                  position: 'relative',
                                  transition: 'all 0.1s',
                                  boxShadow: isSelectedGroupCell ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
                                }}
                              >
                                <span style={{
                                  fontSize: kmapNumVars >= 5 ? 13 : 15,
                                  fontWeight: 800,
                                  color: isTarget ? (primaryColor || (kmapMode === 'sop' ? '#10b981' : '#8b5cf6')) : isX ? '#f59e0b' : 'var(--text-muted)',
                                }}>
                                  {cell.value}
                                </span>
                                <span style={{
                                  position: 'absolute',
                                  bottom: 1,
                                  right: 2,
                                  fontSize: 7.5,
                                  color: 'var(--text-muted)',
                                  opacity: 0.6,
                                }}>
                                  m{cell.minterm}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Interactive Groups & Educational Mode */}
            {kmapSolution.selectedGroups.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Groupements optimaux ({kmapSolution.selectedGroups.length}) — Cliquez pour inspecter la simplification :
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {kmapSolution.selectedGroups.map(g => {
                    const isSel = selectedGroupId === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGroupId(isSel ? null : g.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: `1px solid ${g.color}`,
                          background: isSel ? g.color : `${g.color}18`,
                          color: isSel ? '#000' : 'var(--text-primary)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isSel ? '#000' : g.color }} />
                        <span>{g.term}</span>
                        <span style={{ fontSize: 9, opacity: 0.7 }}>({g.size} cellules{g.spansPlanes ? ', multi-plans' : ''})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Group Explanation Card */}
                {selectedGroupId && (() => {
                  const selGroup = kmapSolution.selectedGroups.find(g => g.id === selectedGroupId);
                  if (!selGroup) return null;
                  return (
                    <div style={{
                      padding: 10,
                      borderRadius: 8,
                      background: `${selGroup.color}15`,
                      border: `1px solid ${selGroup.color}50`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: 11,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: selGroup.color }}>
                          Explication Didactique : Implicant "{selGroup.term}"
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {selGroup.isEssential ? '★ Implicant Premier Essentiel' : 'Implicant Premier'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong>Cellules couvertes :</strong> {selGroup.minterms.map(m => `m${m}`).join(', ')}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong>Variables invariantes :</strong> {selGroup.invariantVariables.map(v => `${v.name}=${v.value}`).join(', ') || 'Aucune'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong>Variables éliminées (changeantes) :</strong> {selGroup.changingVariables.join(', ') || 'Aucune'}
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginTop: 2 }}>
                        💡 {selGroup.explanation}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Simplified Formula Banner */}
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: kmapMode === 'sop' ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)',
              border: `1px solid ${kmapMode === 'sop' ? 'rgba(16,185,129,0.25)' : 'rgba(139,92,246,0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Équation Simplifiée ({kmapMode.toUpperCase()} - {kmapSolution.selectedGroups.length} groupement(s)) :
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: kmapMode === 'sop' ? '#10b981' : '#8b5cf6', marginTop: 2 }}>
                  F = {kmapSolution.simplifiedExpression}
                </div>
              </div>
              <button
                onClick={() => setExpressionInput(kmapSolution.simplifiedExpression)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 5,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Charger dans le lab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM TABS STRIP (10 SPECIALIZED MODULES) ────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 4,
        background: 'var(--surface-1)',
        padding: 4,
        borderRadius: 10,
        border: '1px solid var(--border)',
        overflowX: 'auto',
      }}>
        {[
          { id: 'proof', label: '1. Dérivation Pas-à-Pas', icon: Sparkles },
          { id: 'qmc', label: '2. Quine-McCluskey & Petrick', icon: Layers },
          { id: 'compare', label: '3. Comparateur Solutions', icon: Trophy },
          { id: 'logigram', label: '4. Synthèse Réelle Logisim', icon: GitFork },
          { id: 'classifier', label: '5. Classification & XOR', icon: ShieldCheck },
          { id: 'hazards', label: '6. Aléas & Glitches', icon: AlertTriangle },
          { id: 'propagation', label: '7. Délais & Niveaux', icon: Clock },
          { id: 'library', label: '8. Bibliothèque Modèles', icon: BookOpen },
          { id: 'exercises', label: '9. Exercices', icon: Award },
          { id: 'gates', label: '10. Portes de Base', icon: Cpu },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = bottomTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setBottomTab(tab.id as BottomTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 6,
                border: 'none',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT 1: STEP-BY-STEP PROOF ─────────────────────────────── */}
      {bottomTab === 'proof' && (
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Preuve Algébrique Pas-à-Pas
              </h3>
            </div>
            {analysis.trace?.isVerified && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                <CheckCircle2 size={13} /> Vérifié à 100% sur 2^{analysis.variables.length} lignes
              </span>
            )}
          </div>

          {analysis.trace?.steps.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
              L'expression est déjà sous sa forme la plus simple.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analysis.trace?.steps.map(s => (
                <div
                  key={s.step}
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    borderLeft: '3px solid var(--accent)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Étape {s.step} — {s.law}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {s.before} <span style={{ color: 'var(--accent)' }}>➔</span> <strong>{s.after}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {s.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT 2: QUINE-MCCLUSKEY & PETRICK ───────────────────────── */}
      {bottomTab === 'qmc' && analysis.table && (
        <QMCVisualizer
          result={analysis.trace ? {
            variables: analysis.variables,
            primeImplicants: analysis.table.minterms.map(m => ({ binary: m.toString(2).padStart(analysis.variables.length, '0'), term: `m${m}`, minterms: [m], isEssential: true })),
            essentialPrimeImplicants: [],
            minimalSolutions: [{ expression: analysis.trace.simplifiedExpression, terms: [analysis.trace.simplifiedExpression], cost: { literals: 1, terms: 1, gates: 1, depth: 1 } }],
            bestExpression: analysis.trace.simplifiedExpression,
          } : { variables: [], primeImplicants: [], essentialPrimeImplicants: [], minimalSolutions: [], bestExpression: '0' }}
          minterms={analysis.table.minterms}
          dontCares={[]}
          variables={analysis.variables}
        />
      )}

      {/* ── TAB CONTENT 3: MULTI-SOLUTION COMPARATOR ───────────────────────── */}
      {bottomTab === 'compare' && (
        <ComparePanel
          solutions={compareSolutions}
          onSelectSolution={setExpressionInput}
        />
      )}

      {/* ── TAB CONTENT 4: LOGIGRAM & REAL SIMULATOR EXPORT ────────────────── */}
      {bottomTab === 'logigram' && (
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {/* Architecture Mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Architecture :</span>
              {[
                { id: 'standard', label: 'Standard (ET/OU/NON)' },
                { id: 'all-nand', label: 'Tout-NAND' },
                { id: 'all-nor', label: 'Tout-NOR' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setLogigramMode(m.id as typeof logigramMode)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: `1px solid ${logigramMode === m.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: logigramMode === m.id ? 'var(--accent)' : 'var(--surface-2)',
                    color: logigramMode === m.id ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* REAL LOGISIM PRO CIRCUIT EXPORT */}
            <button
              id="btn-export-to-simulator"
              onClick={handleExportToSimulator}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              }}
            >
              <Zap size={14} />
              <span>Insérer dans le vrai circuit Logisim Pro</span>
            </button>
          </div>

          {/* Interactive Vector Schematic */}
          <div style={{
            background: 'var(--canvas-bg)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            padding: 20,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 260,
          }}>
            {synthesizedCircuit ? (
              <svg width="680" height="260" viewBox="0 0 680 260">
                {/* Background Grid Dots */}
                <pattern id="grid-dots-pro" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.06)" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid-dots-pro)" />

                {/* Components */}
                {synthesizedCircuit.components.map(c => {
                  const isInput = c.type === 'INPUT_PIN';
                  const isOutput = c.type === 'OUTPUT_PIN';
                  return (
                    <g key={c.id} transform={`translate(${c.transform.x}, ${c.transform.y})`}>
                      <rect
                        x="0"
                        y="0"
                        width={c.bounds.width}
                        height={c.bounds.height}
                        rx="6"
                        fill={isInput ? 'var(--surface-1)' : isOutput ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)'}
                        stroke={isInput ? 'var(--accent)' : isOutput ? '#10b981' : 'var(--border)'}
                        strokeWidth="2"
                      />
                      <text
                        x={c.bounds.width / 2}
                        y={c.bounds.height / 2 + 4}
                        textAnchor="middle"
                        fill="var(--text-primary)"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {c.label || c.type}
                      </text>
                    </g>
                  );
                })}

                {/* Wires */}
                {synthesizedCircuit.wires.map(w => (
                  <g key={w.id}>
                    {w.segments.map((seg, sIdx) => (
                      <line
                        key={sIdx}
                        x1={seg.from.x}
                        y1={seg.from.y}
                        x2={seg.to.x}
                        y2={seg.to.y}
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    ))}
                  </g>
                ))}
              </svg>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Calcul du logigramme en cours...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 5: CLASSIFIER & XOR ───────────────────────────────── */}
      {bottomTab === 'classifier' && analysis.classification && analysis.xorAnalysis && (
        <FunctionClassifierPanel
          properties={analysis.classification}
          xorAnalysis={analysis.xorAnalysis}
          onApplyXorExpression={setExpressionInput}
        />
      )}

      {/* ── TAB CONTENT 6: HAZARDS & GLITCHES ──────────────────────────────── */}
      {bottomTab === 'hazards' && analysis.hazardResult && (
        <HazardPanel
          hazardResult={analysis.hazardResult}
          onApplyHazardFreeExpression={setExpressionInput}
        />
      )}

      {/* ── TAB CONTENT 7: PROPAGATION DELAYS ──────────────────────────────── */}
      {bottomTab === 'propagation' && analysis.timing && analysis.depths && (
        <PropagationPanel
          timing={analysis.timing}
          sopDepth={analysis.depths.sop}
          nandDepth={analysis.depths.nand}
          norDepth={analysis.depths.nor}
        />
      )}

      {/* ── TAB CONTENT 8: FUNCTION LIBRARY ────────────────────────────────── */}
      {bottomTab === 'library' && (
        <FunctionLibraryPanel
          onLoadExpression={setExpressionInput}
          currentExpression={expressionInput}
        />
      )}

      {/* ── TAB CONTENT 9: EXERCISES ───────────────────────────────────────── */}
      {bottomTab === 'exercises' && (
        <ExerciseGenerator />
      )}

      {/* ── TAB CONTENT 10: BASIC GATES EXPLORER ───────────────────────────── */}
      {bottomTab === 'gates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* Left: Gate Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {GATES_DATA.map(g => {
              const isSel = selectedGate.type === g.type;
              return (
                <button
                  key={g.type}
                  onClick={() => setSelectedGate(g)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSel ? 'rgba(59,130,246,0.12)' : 'var(--surface-1)',
                    color: isSel ? 'var(--accent)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isSel ? 700 : 500,
                  }}
                >
                  <span>{g.name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.8 }}>{g.symbol}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Gate Interactive SVG & Properties */}
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedGate.name}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedGate.description}
              </p>
            </div>

            {/* Interactive Gate Simulation */}
            <div style={{
              background: 'var(--canvas-bg)',
              borderRadius: 8,
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => setGateInA(a => (a === 1 ? 0 : 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: `1px solid ${gateInA ? '#10b981' : 'var(--border)'}`,
                    background: gateInA ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                    color: gateInA ? '#10b981' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Entrée A = {gateInA}
                </button>
                {selectedGate.inputs === 2 && (
                  <button
                    onClick={() => setGateInB(b => (b === 1 ? 0 : 1))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: `1px solid ${gateInB ? '#10b981' : 'var(--border)'}`,
                      background: gateInB ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                      color: gateInB ? '#10b981' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Entrée B = {gateInB}
                  </button>
                )}
              </div>

              <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />

              <div style={{
                padding: '10px 18px',
                borderRadius: 8,
                background: selectedGate.fn(gateInA, gateInB) ? 'rgba(16,185,129,0.2)' : 'var(--surface-2)',
                border: `1px solid ${selectedGate.fn(gateInA, gateInB) ? '#10b981' : 'var(--border)'}`,
                color: selectedGate.fn(gateInA, gateInB) ? '#10b981' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: 14,
              }}>
                Sortie S = {selectedGate.fn(gateInA, gateInB)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
