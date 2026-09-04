/**
 * Boolean Function Library
 * Reusable function templates (Half Adder, Full Adder, etc.) + user-saved functions.
 * Uses localStorage for persistence. No external dependencies.
 */

export interface FunctionOutput {
  name: string;
  expression: string;
  description: string;
}

export interface FunctionLibraryEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  inputs: string[];
  outputs: FunctionOutput[];
  tags: string[];
  isBuiltin: boolean;
  createdAt: number;
}

// ── 17 Educational Built-in Templates ────────────────────────────────────────

export const BUILTIN_TEMPLATES: FunctionLibraryEntry[] = [
  {
    id: 'half-adder',
    name: 'Demi-Additionneur (Half Adder)',
    category: 'Arithmétique',
    description: 'Additionne deux bits. Produit Sum (somme) et Cout (retenue sortante).',
    inputs: ['A', 'B'],
    outputs: [
      { name: 'Sum', expression: "A.B' + A'.B", description: 'Somme (XOR)' },
      { name: 'Cout', expression: 'A.B', description: 'Retenue sortante (AND)' },
    ],
    tags: ['addition', 'arithmétique', 'XOR'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'full-adder',
    name: 'Additionneur Complet (Full Adder)',
    category: 'Arithmétique',
    description: 'Additionne deux bits avec une retenue entrante. Cascade possible pour les additioneurs multi-bits.',
    inputs: ['A', 'B', 'Cin'],
    outputs: [
      { name: 'Sum', expression: "A.B'.Cin' + A'.B.Cin' + A'.B'.Cin + A.B.Cin", description: 'Somme = A ⊕ B ⊕ Cin' },
      { name: 'Cout', expression: 'A.B + A.Cin + B.Cin', description: 'Retenue sortante' },
    ],
    tags: ['addition', 'arithmétique', 'retenue'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'half-subtractor',
    name: 'Demi-Soustracteur (Half Subtractor)',
    category: 'Arithmétique',
    description: 'Soustrait deux bits. Produit Diff (différence) et Bout (emprunt sortant).',
    inputs: ['A', 'B'],
    outputs: [
      { name: 'Diff', expression: "A.B' + A'.B", description: 'Différence = A ⊕ B' },
      { name: 'Bout', expression: "A'.B", description: 'Emprunt sortant' },
    ],
    tags: ['soustraction', 'arithmétique'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'full-subtractor',
    name: 'Soustracteur Complet (Full Subtractor)',
    category: 'Arithmétique',
    description: 'Soustrait deux bits avec emprunt entrant.',
    inputs: ['A', 'B', 'Bin'],
    outputs: [
      { name: 'Diff', expression: "A.B'.Bin' + A'.B.Bin' + A'.B'.Bin + A.B.Bin", description: 'Différence = A ⊕ B ⊕ Bin' },
      { name: 'Bout', expression: "A'.B + A'.Bin + B.Bin", description: 'Emprunt sortant' },
    ],
    tags: ['soustraction', 'arithmétique'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'mux-2to1',
    name: 'Multiplexeur 2:1 (MUX)',
    category: 'Routage de données',
    description: 'Sélectionne entre deux entrées selon le signal de sélection S.',
    inputs: ['A', 'B', 'S'],
    outputs: [
      { name: 'Y', expression: "A.S' + B.S", description: 'Sortie: Y = A si S=0, Y = B si S=1' },
    ],
    tags: ['multiplexeur', 'sélection', 'routage'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'demux-1to2',
    name: 'Démultiplexeur 1:2 (DEMUX)',
    category: 'Routage de données',
    description: 'Achemine une entrée vers une des deux sorties selon S.',
    inputs: ['D', 'S'],
    outputs: [
      { name: 'Y0', expression: "D.S'", description: 'Sortie 0 (actif si S=0)' },
      { name: 'Y1', expression: 'D.S', description: 'Sortie 1 (actif si S=1)' },
    ],
    tags: ['démultiplexeur', 'routage'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'encoder-4to2',
    name: 'Encodeur 4:2',
    category: 'Codage',
    description: 'Encode 4 entrées (1-parmi-n) en 2 bits binaires.',
    inputs: ['I0', 'I1', 'I2', 'I3'],
    outputs: [
      { name: 'A', expression: 'I2 + I3', description: 'Bit de poids fort' },
      { name: 'B', expression: 'I1 + I3', description: 'Bit de poids faible' },
    ],
    tags: ['encodeur', 'binaire', 'codage'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'decoder-2to4',
    name: 'Décodeur 2:4',
    category: 'Codage',
    description: 'Décode 2 bits binaires en 4 sorties (1-parmi-4 actif).',
    inputs: ['A', 'B'],
    outputs: [
      { name: 'Y0', expression: "A'.B'", description: 'Sortie 0 (AB=00)' },
      { name: 'Y1', expression: "A'.B", description: 'Sortie 1 (AB=01)' },
      { name: 'Y2', expression: "A.B'", description: 'Sortie 2 (AB=10)' },
      { name: 'Y3', expression: 'A.B', description: 'Sortie 3 (AB=11)' },
    ],
    tags: ['décodeur', 'binaire', 'codage'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'priority-encoder-4to2',
    name: 'Encodeur Prioritaire 4:2',
    category: 'Codage',
    description: 'Encode la position du bit actif de plus haute priorité (I3 > I2 > I1 > I0).',
    inputs: ['I0', 'I1', 'I2', 'I3'],
    outputs: [
      { name: 'A', expression: 'I2 + I3', description: 'MSB de sortie' },
      { name: 'B', expression: "I1.I2' + I3", description: 'LSB de sortie' },
      { name: 'V', expression: 'I0 + I1 + I2 + I3', description: 'Valid (au moins une entrée active)' },
    ],
    tags: ['encodeur prioritaire', 'arbitrage'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'comparator-1bit',
    name: 'Comparateur 1 bit',
    category: 'Comparaison',
    description: 'Compare deux bits A et B. Produit trois sorties: A>B, A=B, A<B.',
    inputs: ['A', 'B'],
    outputs: [
      { name: 'GT', expression: "A.B'", description: 'A > B' },
      { name: 'EQ', expression: "A.B + A'.B'", description: 'A = B (XNOR)' },
      { name: 'LT', expression: "A'.B", description: 'A < B' },
    ],
    tags: ['comparateur', 'égalité', 'arithmétique'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'parity-generator-3bit',
    name: 'Générateur de parité 3 bits (impaire)',
    category: 'Détection d\'erreurs',
    description: 'Génère un bit de parité P tel que l\'ensemble A,B,C,P ait un nombre impair de 1.',
    inputs: ['A', 'B', 'C'],
    outputs: [
      { name: 'P', expression: "A.B'.C' + A'.B.C' + A'.B'.C + A.B.C", description: 'Bit de parité (XOR global)' },
    ],
    tags: ['parité', 'détection erreurs', 'XOR'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'parity-checker-3bit',
    name: 'Vérificateur de parité 3 bits',
    category: 'Détection d\'erreurs',
    description: 'Vérifie que A,B,C,P ont une parité impaire. Erreur si P (parité) est incorrect.',
    inputs: ['A', 'B', 'C', 'P'],
    outputs: [
      { name: 'Error', expression: "A.B'.C'.P' + A'.B.C'.P' + A'.B'.C.P' + A.B.C.P' + A.B'.C.P + A'.B.C.P + A'.B'.C'.P + A.B.C'.P", description: 'Erreur détectée (parité incorrecte)' },
    ],
    tags: ['parité', 'vérification', 'erreur'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'and-gate',
    name: 'Porte ET (AND)',
    category: 'Portes de base',
    description: 'Porte logique AND à 2 entrées. F=1 uniquement si A=1 et B=1.',
    inputs: ['A', 'B'],
    outputs: [{ name: 'F', expression: 'A.B', description: 'Sortie AND' }],
    tags: ['and', 'porte'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'or-gate',
    name: 'Porte OU (OR)',
    category: 'Portes de base',
    description: 'Porte logique OR à 2 entrées. F=1 si au moins A=1 ou B=1.',
    inputs: ['A', 'B'],
    outputs: [{ name: 'F', expression: 'A + B', description: 'Sortie OR' }],
    tags: ['or', 'porte'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'xor-gate',
    name: 'Porte XOR',
    category: 'Portes de base',
    description: 'Porte XOR à 2 entrées. F=1 si A≠B.',
    inputs: ['A', 'B'],
    outputs: [{ name: 'F', expression: "A.B' + A'.B", description: 'Sortie XOR' }],
    tags: ['xor', 'parité', 'porte'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'nand-gate',
    name: 'Porte NON-ET (NAND)',
    category: 'Portes de base',
    description: 'Porte universelle NAND. F=0 uniquement si A=1 et B=1.',
    inputs: ['A', 'B'],
    outputs: [{ name: 'F', expression: "(A.B)'", description: 'Sortie NAND' }],
    tags: ['nand', 'universel', 'porte'],
    isBuiltin: true,
    createdAt: 0,
  },
  {
    id: 'nor-gate',
    name: 'Porte NON-OU (NOR)',
    category: 'Portes de base',
    description: 'Porte universelle NOR. F=1 uniquement si A=0 et B=0.',
    inputs: ['A', 'B'],
    outputs: [{ name: 'F', expression: "(A + B)'", description: 'Sortie NOR' }],
    tags: ['nor', 'universel', 'porte'],
    isBuiltin: true,
    createdAt: 0,
  },
];

const STORAGE_KEY = 'logisim_pro_function_library';

// ── User Function Library (localStorage-backed) ────────────────────────────

export function getUserFunctions(): FunctionLibraryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as FunctionLibraryEntry[];
  } catch {
    return [];
  }
}

export function saveUserFunction(entry: Omit<FunctionLibraryEntry, 'id' | 'isBuiltin' | 'createdAt'>): FunctionLibraryEntry {
  const functions = getUserFunctions();
  const newEntry: FunctionLibraryEntry = {
    ...entry,
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    isBuiltin: false,
    createdAt: Date.now(),
  };
  functions.push(newEntry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(functions));
  return newEntry;
}

export function deleteUserFunction(id: string): void {
  const functions = getUserFunctions().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(functions));
}

export function updateUserFunction(id: string, updates: Partial<FunctionLibraryEntry>): void {
  const functions = getUserFunctions().map(f =>
    f.id === id ? { ...f, ...updates, id, isBuiltin: false } : f
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(functions));
}

export function exportFunctionLibrary(): string {
  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    functions: getUserFunctions(),
  }, null, 2);
}

export function importFunctionLibrary(jsonStr: string): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;

  try {
    const data = JSON.parse(jsonStr);
    const functions: FunctionLibraryEntry[] = Array.isArray(data) ? data : (data.functions ?? []);
    const existing = getUserFunctions();

    for (const fn of functions) {
      if (!fn.name || !fn.inputs || !fn.outputs) {
        errors.push(`Entrée invalide ignorée : ${JSON.stringify(fn).slice(0, 60)}`);
        continue;
      }
      // Skip duplicates by name
      if (!existing.some(e => e.name === fn.name)) {
        existing.push({ ...fn, id: `user-${Date.now()}-${imported}`, isBuiltin: false });
        imported++;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    errors.push(`Erreur de parsing JSON : ${e}`);
  }

  return { imported, errors };
}

export function getAllFunctions(): FunctionLibraryEntry[] {
  return [...BUILTIN_TEMPLATES, ...getUserFunctions()];
}

export function getFunctionsByCategory(): Record<string, FunctionLibraryEntry[]> {
  const all = getAllFunctions();
  const groups: Record<string, FunctionLibraryEntry[]> = {};
  for (const fn of all) {
    if (!groups[fn.category]) groups[fn.category] = [];
    groups[fn.category].push(fn);
  }
  return groups;
}
