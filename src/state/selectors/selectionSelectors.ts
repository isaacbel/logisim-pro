/**
 * Selection Selectors — Narrow Zustand selectors for selection state.
 */
import type { AppState } from '@state/store';

export const selectSelection = (s: AppState) => s.selection;
export const selectSelectedEntityIds = (s: AppState) => s.selection.selectedEntityIds;
export const selectSelectedWireIds = (s: AppState) => s.selection.selectedWireIds;
export const selectSelectionBox = (s: AppState) => s.selection.selectionBox;
export const selectIsDragging = (s: AppState) => s.selection.isDragging;
export const selectHasSelection = (s: AppState) =>
  s.selection.selectedEntityIds.size > 0 || s.selection.selectedWireIds.size > 0;
