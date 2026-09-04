/**
 * Builds the exact text written to a downloaded .asm file.
 *
 * The body is the user's source verbatim. The header states only facts obtained by running the
 * real assembler over that same text, so the summary can never drift from what the file
 * contains — including the case where the source does not assemble, which is reported rather
 * than hidden.
 */

import { assemble8086 } from './assembler8086';

export interface AsmExportFacts {
  /** Bytes actually emitted by the assembler for this source. */
  readonly byteCount: number;
  /** Listing entries that emitted at least one machine byte. */
  readonly instructionCount: number;
  readonly errors: { line: number; message: string }[];
  readonly assembles: boolean;
}

export type AsmExportOutcome =
  | { readonly ok: false; readonly reason: 'empty-source'; readonly message: string }
  | { readonly ok: true; readonly contents: string; readonly facts: AsmExportFacts };

function hex(value: number, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * @param sourceCode The user's assembly source, exported verbatim.
 * @param projectName Optional name used in the header only.
 */
export function buildAsmExport(sourceCode: string, projectName?: string): AsmExportOutcome {
  if (!sourceCode || sourceCode.trim().length === 0) {
    return {
      ok: false,
      reason: 'empty-source',
      message: 'The 8086 editor is empty. Write or load a program before exporting.',
    };
  }

  const asm = assemble8086(sourceCode);
  const byteCount = asm.machineCode.length;
  const instructionCount = asm.listing.filter(line => line.machineBytes.length > 0).length;
  const labels = Object.keys(asm.symbolTable);

  const header: string[] = [
    '; ============================================================================',
    `;  ${projectName?.trim() || 'Intel 8086 program'} — assembly source`,
    ';  Exported from Logisim Pro',
    '; ----------------------------------------------------------------------------',
    `;  Encoded instructions : ${instructionCount}`,
    `;  Machine code         : ${byteCount} byte${byteCount === 1 ? '' : 's'}`,
    `;  Load address         : ${hex(asm.codeSegment, 4)}:${hex(asm.startOffset, 4)}`,
  ];

  if (labels.length > 0) {
    header.push(`;  Labels               : ${labels.map(l => `${l}=${hex(asm.symbolTable[l], 4)}`).join(', ')}`);
  }

  if (asm.errors.length > 0) {
    header.push(
      '; ----------------------------------------------------------------------------',
      `;  NOT ASSEMBLED CLEANLY — ${asm.errors.length} error${asm.errors.length === 1 ? '' : 's'}.`,
      ';  Line numbers below refer to the source as it appears in the editor.',
    );
    for (const err of asm.errors) {
      header.push(`;    Line ${err.line}: ${err.message}`);
    }
  }

  header.push('; ============================================================================', '');

  const body = sourceCode.endsWith('\n') ? sourceCode : `${sourceCode}\n`;

  return {
    ok: true,
    contents: `${header.join('\n')}${body}`,
    facts: {
      byteCount,
      instructionCount,
      errors: asm.errors,
      assembles: asm.success,
    },
  };
}
