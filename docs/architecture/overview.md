# Logisim Pro - Architecture Documentation

## Overview

Logisim Pro is a professional digital logic simulator built with modern web technologies and packaged as a desktop application via Electron.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Language | TypeScript | Type-safe development |
| Framework | React 18 | UI components |
| Bundler | Vite | Fast development & building |
| Desktop | Electron | Cross-platform packaging |
| Canvas | PixiJS | WebGL rendering (10k+ components) |
| State | Zustand | Lightweight state management |
| Styling | Tailwind CSS | Utility-first CSS |
| Animation | Framer Motion | UI transitions |
| Testing | Vitest + Playwright | Unit & E2E tests |

## Architecture Layers

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  React Components | Tailwind | Framer  │
├─────────────────────────────────────────┤
│           Application Layer             │
│  Zustand Store | Command Pattern | I18n │
├─────────────────────────────────────────┤
│           Renderer Layer                │
│  PixiJS | Spatial Hash | Culling      │
├─────────────────────────────────────────┤
│           Simulation Layer              │
│  Event Engine | ECS | Web Worker       │
├─────────────────────────────────────────┤
│           Domain Layer                  │
│  Component Registry | Signal Logic     │
├─────────────────────────────────────────┤
│           Infrastructure               │
│  Electron | File System | IndexedDB    │
└─────────────────────────────────────────┘
```

## Entity Component System (ECS)

The ECS architecture provides:
- **Sparse Sets** for O(1) component lookups
- **Archetype-based** storage for cache efficiency
- **System Manager** for ordered execution
- **10,000+ entity** support with minimal memory overhead

### Key Classes

- `World` - Manages entities and components
- `System` - Base class for logic systems
- `SystemManager` - Orchestrates system execution

## Simulation Engine

### Event-Driven Architecture

1. **Priority Queue** (Min-Heap) schedules events by simulation tick
2. **Propagation Delay** modeled per component
3. **Tri-state Logic** with conflict detection
4. **Hazard Detection** tracks rapid signal toggling
5. **Oscillation Detection** identifies feedback loops

### Signal Resolution

```
ERROR > HIGH/LOW conflict > HIGH > LOW > FLOATING > UNKNOWN
```

### Web Worker Integration

The simulation runs in a dedicated Web Worker to maintain 60FPS UI rendering:
- Main thread: Rendering + User Input
- Worker thread: Simulation ticks
- Communication: Comlink (proxy-based RPC)

## Rendering Pipeline

### Spatial Hash Grid

Divides the canvas into cells (200px) for O(1) visibility queries:
- Insert: O(1) per cell
- Query: O(cells in view)
- Cull: Only render visible components

### Layer Structure

```
Stage
├── Viewport (pan/zoom transform)
│   ├── Grid Layer
│   ├── Wire Layer
│   └── Component Layer
└── UI Layer (selection box, overlays)
```

## State Management

### Zustand Store Structure

```typescript
interface AppState {
  project: Project | null;
  currentCircuitId: string | null;
  editor: EditorState;
  viewport: ViewportState;
  simulation: SimulationState;
}
```

### Command Pattern (Undo/Redo)

Every mutating action creates an inverse command:
```typescript
interface EditorAction {
  type: 'add' | 'remove' | 'move' | 'connect';
  payload: unknown;
  inverse: EditorAction;
}
```

## Plugin System

Plugins are dynamically loaded ES modules with a standardized API:

```typescript
interface PluginAPI {
  registerComponent(def: ComponentDefinition): void;
  registerTheme(theme: ThemeDefinition): void;
  registerExporter(exporter: ExporterDefinition): void;
  onSimulationTick(callback: Function): void;
}
```

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Components | 10,000+ | ECS + Spatial Culling |
| Wires | 50,000+ | Batch Rendering |
| FPS | 60 | WebGL + Worker |
| Memory | < 500MB | Lazy Loading |
| Startup | < 3s | Code Splitting |

## File Organization

```
src/
├── core/          # ECS, events, utilities
├── engine/        # Simulation engine
├── renderer/      # PixiJS canvas renderer
├── ui/            # React components
├── state/         # Zustand stores
├── types/         # TypeScript definitions
├── workers/       # Web Workers
└── plugins/       # Plugin system
```
