/**
 * Boolean Algebraic Laws and Formal Descriptions
 * Educational descriptions in French for students and learners.
 */

export interface BooleanLaw {
  id: string;
  name: string;
  category: string;
  formulaOr: string;
  formulaAnd: string;
  explanation: string;
}

export const BOOLEAN_LAWS: Record<string, BooleanLaw> = {
  identity: {
    id: 'identity',
    name: 'Élément neutre (Identité)',
    category: 'Propriétés fondamentales',
    formulaOr: 'A + 0 = A',
    formulaAnd: 'A · 1 = A',
    explanation: "0 est l'élément neutre du OU (+), et 1 est l'élément neutre du ET (·). Ils ne modifient pas la valeur de A.",
  },
  nullElement: {
    id: 'nullElement',
    name: 'Élément absorbant (Annihilateur)',
    category: 'Propriétés fondamentales',
    formulaOr: 'A + 1 = 1',
    formulaAnd: 'A · 0 = 0',
    explanation: "1 absorbe toute opération OU (car 1 OU n'importe quoi donne 1). 0 absorbe toute opération ET (car 0 ET n'importe quoi donne 0).",
  },
  idempotence: {
    id: 'idempotence',
    name: 'Idempotence',
    category: 'Propriétés fondamentales',
    formulaOr: 'A + A = A',
    formulaAnd: 'A · A = A',
    explanation: "Répéter la même variable plusieurs fois avec le même opérateur ne change pas son état logique.",
  },
  complement: {
    id: 'complement',
    name: 'Complémentarité',
    category: 'Propriétés fondamentales',
    formulaOr: "A + A' = 1",
    formulaAnd: "A · A' = 0",
    explanation: "Une variable et son inverse couvrent toujours tout l'univers booléen (l'un vaut 1, l'autre 0).",
  },
  involution: {
    id: 'involution',
    name: 'Involution (Double négation)',
    category: 'Propriétés fondamentales',
    formulaOr: "¬(¬A) = A",
    formulaAnd: "(A')' = A",
    explanation: "Inverser deux fois une variable redonne la variable initiale (deux NON s'annulent).",
  },
  commutativity: {
    id: 'commutativity',
    name: 'Commutativité',
    category: 'Structure algébrique',
    formulaOr: 'A + B = B + A',
    formulaAnd: 'A · B = B · A',
    explanation: "L'ordre des opérandes n'a aucune influence sur le résultat du ET ou du OU.",
  },
  associativity: {
    id: 'associativity',
    name: 'Associativité',
    category: 'Structure algébrique',
    formulaOr: 'A + (B + C) = (A + B) + C = A + B + C',
    formulaAnd: 'A · (B · C) = (A · B) · C = A · B · C',
    explanation: "Le regroupement par parenthèses d'opérateurs identiques successifs peut être retiré.",
  },
  distributivity: {
    id: 'distributivity',
    name: 'Distributivité',
    category: 'Expansion & Factorisation',
    formulaOr: 'A + (B · C) = (A + B) · (A + C)',
    formulaAnd: 'A · (B + C) = A·B + A·C',
    explanation: "Le ET est distributif sur le OU, et le OU est distributif sur le ET (dualité).",
  },
  absorption: {
    id: 'absorption',
    name: 'Absorption',
    category: 'Règles de simplification',
    formulaOr: 'A + A·B = A',
    formulaAnd: 'A · (A + B) = A',
    explanation: "Si le terme A est présent seul, le terme A·B est redondant car si A=1 le résultat est 1, et si A=0 alors A·B=0.",
  },
  generalizedAbsorption: {
    id: 'generalizedAbsorption',
    name: 'Absorption généralisée (Règle de redondance)',
    category: 'Règles de simplification',
    formulaOr: "A + A'·B = A + B",
    formulaAnd: "A · (A' + B) = A · B",
    explanation: "Puisque A + A'·B = (A + A')·(A + B) = 1·(A + B) = A + B.",
  },
  consensus: {
    id: 'consensus',
    name: 'Théorème du Consensus',
    category: 'Règles de simplification',
    formulaOr: "A·B + A'·C + B·C = A·B + A'·C",
    formulaAnd: "(A+B) · (A'+C) · (B+C) = (A+B) · (A'+C)",
    explanation: "Le terme B·C est un consensus redondant produit par la combinaison de A et A'. Il peut être éliminé.",
  },
  deMorgan: {
    id: 'deMorgan',
    name: 'Théorème de De Morgan',
    category: 'Dualité & Complémentation',
    formulaOr: "(A + B)' = A' · B'",
    formulaAnd: "(A · B)' = A' + B'",
    explanation: "Le complément d'une somme est le produit des compléments. Le complément d'un produit est la somme des compléments.",
  },
  adjacency: {
    id: 'adjacency',
    name: 'Adjacence logique (Fusion de mintermes)',
    category: 'Règles de simplification',
    formulaOr: "A·B + A·B' = A",
    formulaAnd: "(A+B) · (A+B') = A",
    explanation: "Deux termes différant uniquement par le complément d'une seule variable fusionnent en éliminant cette variable.",
  },
};
