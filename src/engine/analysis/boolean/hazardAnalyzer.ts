/**
 * Hazard Analyzer for Combinational Logic
 * Detects Static-1 and Static-0 hazards in SOP/POS implementations.
 * IMPORTANT: Hazards are a physical timing phenomenon, distinct from logical minimization.
 */



export type HazardType = 'static-1' | 'static-0';

export interface Hazard {
  type: HazardType;
  variable: string;         // The variable that transitions
  fromMinterm: number;      // Input combination m that transitions to...
  toMinterm: number;        // ...input combination m' (differ by 1 bit)
  fromTerm: string;         // Product term covering fromMinterm
  toTerm: string;           // Product term covering toMinterm
  redundantTerm: string;    // Consensus term that would bridge the gap
  explanation: string;
}

export interface HazardAnalysisResult {
  hazards: Hazard[];
  hasHazards: boolean;
  redundantTerms: string[];           // Unique redundant terms to add
  hazardFreeExpression: string;       // Original SOP + redundant terms
  explanation: string;
}

/**
 * Analyzes a SOP circuit implementation for static hazards.
 *
 * @param minterms         - Output=1 minterms (must-cover)
 * @param sopTerms         - Current SOP product terms (e.g. ["AB", "A'C"])
 * @param variables        - Variable names in order
 */
export function analyzeHazards(
  minterms: number[],
  sopTerms: string[],
  variables: string[]
): HazardAnalysisResult {
  const n = variables.length;
  const mintermSet = new Set(minterms);
  const hazards: Hazard[] = [];
  const redundantTermsSet = new Set<string>();

  // Build term-to-minterms map from sopTerms
  // We re-derive coverage from QM-style masks
  const termCoverages: { term: string; minterms: Set<number> }[] = sopTerms.map(term => ({
    term,
    minterms: computeTermCoverage(term, variables),
  }));

  // ── Static-1 Hazard Detection ──────────────────────────────────────────────
  // A static-1 hazard occurs when a 1→1 transition (single variable changes)
  // crosses the boundary between two product terms with no shared term bridging them.
  for (let m = 0; m < (1 << n); m++) {
    if (!mintermSet.has(m)) continue;

    for (let v = 0; v < n; v++) {
      const mask = 1 << (n - 1 - v);
      if ((m & mask) === 0) continue; // only transitions 1→0 for this variable (m has bit v=1, neighbor has bit v=0)

      const neighbor = m ^ mask; // flip bit v
      if (!mintermSet.has(neighbor)) continue; // both must be 1s for a 1→1 transition

      // Find which terms cover m and which cover neighbor
      const coverM = termCoverages.filter(tc => tc.minterms.has(m));
      const coverN = termCoverages.filter(tc => tc.minterms.has(neighbor));

      // If no single term covers both, there's a hazard
      const sharedTerm = coverM.find(cm => coverN.some(cn => cn.term === cm.term));
      if (!sharedTerm) {
        // Generate the consensus (bridging) term
        const varName = variables[v];
        const redundant = generateConsensusTerm(coverM[0]?.term ?? '', coverN[0]?.term ?? '', varName);
        redundantTermsSet.add(redundant);

        hazards.push({
          type: 'static-1',
          variable: varName,
          fromMinterm: neighbor,
          toMinterm: m,
          fromTerm: coverN[0]?.term ?? '?',
          toTerm: coverM[0]?.term ?? '?',
          redundantTerm: redundant,
          explanation: `Aléa statique-1 sur ${varName}: transition ${neighbor}→${m} croise la frontière entre '${coverN[0]?.term ?? '?'}' et '${coverM[0]?.term ?? '?'}'. Ajoutez le terme de consensus '${redundant}' pour éliminer l'aléa.`,
        });
      }
    }
  }

  // ── Static-0 Hazard Detection ──────────────────────────────────────────────
  // Static-0 hazard: a 0→0 transition where an intermediate 1 glitch is possible
  // This happens in POS implementations but also in SOP: covered by complement check
  for (let m = 0; m < (1 << n); m++) {
    if (mintermSet.has(m)) continue; // F=0 cell

    for (let v = 0; v < n; v++) {
      const mask = 1 << (n - 1 - v);
      const neighbor = m ^ mask;

      if (mintermSet.has(neighbor)) continue; // both must be 0 for static-0 hazard

      // If both 0 but one covered by a term and the other by a different pathway,
      // a glitch through a 1-state may occur (less common in pure SOP, more in POS)
      // For SOP: this is usually not a concern; we'll flag if maxterm boundaries cross
      // Simplified: only report if there's an odd number of literal differences in the gap
      const coverM = termCoverages.filter(tc => tc.minterms.has(m));
      const coverN = termCoverages.filter(tc => tc.minterms.has(neighbor));

      if (coverM.length > 0 && coverN.length > 0) {
        hazards.push({
          type: 'static-0',
          variable: variables[v],
          fromMinterm: m,
          toMinterm: neighbor,
          fromTerm: coverM[0].term,
          toTerm: coverN[0].term,
          redundantTerm: '',
          explanation: `Aléa statique-0 potentiel sur ${variables[v]}: transition 0→0 entre mintermes ${m} et ${neighbor}. Nécessite une analyse de timing approfondie dans le contexte du circuit réel.`,
        });
      }
    }
  }

  const redundantTerms = Array.from(redundantTermsSet).filter(t => t.length > 0);
  const hazardFreeExpression = [...sopTerms, ...redundantTerms].join(' + ');

  const descr = hazards.length === 0
    ? 'Aucun aléa statique détecté dans cette implémentation SOP.'
    : `${hazards.filter(h => h.type === 'static-1').length} aléa(s) statique-1 et ${hazards.filter(h => h.type === 'static-0').length} aléa(s) statique-0 détecté(s). L'expression sans aléa requiert des termes de consensus redondants.`;

  return {
    hazards,
    hasHazards: hazards.length > 0,
    redundantTerms,
    hazardFreeExpression,
    explanation: descr,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute which minterms a product term covers.
 * Term format: e.g. "AB'C" — variables are uppercase letters, ' is complement.
 */
function computeTermCoverage(term: string, variables: string[]): Set<number> {
  const n = variables.length;
  const total = 1 << n;
  const coverage = new Set<number>();

  // Parse literals from term
  const posLits = new Set<string>();
  const negLits = new Set<string>();

  const lits = term.match(/[A-Z]'?/g) ?? [];
  for (const lit of lits) {
    if (lit.endsWith("'")) negLits.add(lit[0]);
    else posLits.add(lit);
  }

  if (posLits.size === 0 && negLits.size === 0) {
    // Constant or empty term
    for (let m = 0; m < total; m++) coverage.add(m);
    return coverage;
  }

  for (let m = 0; m < total; m++) {
    let matches = true;
    for (let v = 0; v < n; v++) {
      const varName = variables[v];
      const bit = (m >> (n - 1 - v)) & 1;
      if (posLits.has(varName) && bit !== 1) { matches = false; break; }
      if (negLits.has(varName) && bit !== 0) { matches = false; break; }
    }
    if (matches) coverage.add(m);
  }

  return coverage;
}

/**
 * Generate a consensus (bridging) term for two product terms that differ on variable v.
 * For terms t1 (containing v) and t2 (containing v'), the consensus is t1 without v PLUS t2 without v'.
 */
function generateConsensusTerm(term1: string, term2: string, bridgeVar: string): string {
  const lits1 = (term1.match(/[A-Z]'?/g) ?? []).filter(l => l.replace("'", '') !== bridgeVar);
  const lits2 = (term2.match(/[A-Z]'?/g) ?? []).filter(l => l.replace("'", '') !== bridgeVar);

  const combined = new Map<string, string>();
  for (const lit of [...lits1, ...lits2]) {
    const base = lit.replace("'", '');
    if (!combined.has(base)) combined.set(base, lit);
  }

  const parts = Array.from(combined.values()).sort();
  return parts.join('') || '1';
}
