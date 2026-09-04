/**
 * Logisim Pro — Authoritative Versioned Project File Schema (.lpro)
 * Designed for reliable cross-platform serialization, student sharing,
 * backward-compatibility, and educational archiving.
 */

import type { Project, WaveformProbe, ViewportState } from '@apptypes/core';

export const CURRENT_FORMAT_VERSION = 1;
export const CURRENT_APPLICATION_VERSION = '1.0.0';

export interface LogisimProProjectMetadata {
  name: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  course?: string;
  assignment?: string;
}

export interface LogisimProProjectFile {
  formatVersion: number;
  applicationVersion: string;
  generator: string;
  metadata: LogisimProProjectMetadata;
  project: Project;
  probes?: WaveformProbe[];
  viewport?: ViewportState;
  booleanAlgebra?: {
    expression?: string;
    variableCount?: number;
    kmapMinTerms?: number[];
    kmapDontCares?: number[];
  };
  arch8086?: {
    sourceCode?: string;
    assembledHex?: string;
    startOffset?: number;
  };
}

/**
 * Creates a fresh, well-structured Logisim Pro project file
 */
export function createProjectFile(
  project: Project,
  metadata?: Partial<LogisimProProjectMetadata>,
  extra?: {
    probes?: WaveformProbe[];
    viewport?: ViewportState;
    booleanAlgebra?: LogisimProProjectFile['booleanAlgebra'];
    arch8086?: LogisimProProjectFile['arch8086'];
  }
): LogisimProProjectFile {
  const now = new Date().toISOString();
  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    applicationVersion: CURRENT_APPLICATION_VERSION,
    generator: 'Logisim Pro Educational Suite',
    metadata: {
      name: project.name || 'Untitled Circuit Project',
      description: metadata?.description || '',
      author: metadata?.author || 'Student',
      createdAt: metadata?.createdAt || now,
      updatedAt: now,
      tags: metadata?.tags || ['digital-logic'],
      course: metadata?.course || '',
      assignment: metadata?.assignment || '',
    },
    project,
    probes: extra?.probes || [],
    viewport: extra?.viewport,
    booleanAlgebra: extra?.booleanAlgebra,
    arch8086: extra?.arch8086,
  };
}

/**
 * Serializes a Logisim Pro project file to JSON with formatting
 */
export function serializeProjectFile(file: LogisimProProjectFile): string {
  return JSON.stringify(file, null, 2);
}
