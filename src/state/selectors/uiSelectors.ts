/**
 * UI Selectors — Narrow Zustand selectors for UI / editor state.
 */
import type { AppState } from '@state/store';

export const selectTheme = (s: AppState) => s.theme;
export const selectLanguage = (s: AppState) => s.language;
export const selectAppMode = (s: AppState) => s.appMode;
export const selectArchPage = (s: AppState) => s.archPage;
export const selectArchInspectorValue = (s: AppState) => s.archInspectorValue;

export const selectEditor = (s: AppState) => s.editor;
export const selectCurrentTool = (s: AppState) => s.editor.currentTool;
export const selectCurrentComponentType = (s: AppState) => s.editor.currentComponentType;
export const selectHoveredEntityId = (s: AppState) => s.editor.hoveredEntityId;
export const selectActiveBottomTab = (s: AppState) => s.editor.activeBottomTab;
export const selectZoom = (s: AppState) => s.editor.zoom;

export const selectViewport = (s: AppState) => s.viewport;
export const selectViewportTransform = (s: AppState) => s.viewport.transform;
export const selectGridSize = (s: AppState) => s.viewport.gridSize;
export const selectSnapToGrid = (s: AppState) => s.viewport.snapToGrid;
export const selectShowGrid = (s: AppState) => s.viewport.showGrid;

export const selectConsoleMessages = (s: AppState) => s.consoleMessages;
