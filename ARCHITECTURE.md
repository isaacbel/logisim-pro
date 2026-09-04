# Architecture

The Zustand store is the canonical editor model: project circuits, components, wires, selection, viewport, simulation display state, probes, and history all live there. Canvas code never mutates circuit objects directly.

`SimulationService` owns one Comlink Web Worker. It serializes the active circuit on load/change, sends input changes and ticks as small requests, and applies worker snapshots immutably to pin and wire display values. The worker owns transient simulation state, including flip-flop state; that state is not serialized into project files.

The Canvas 2D renderer reads the store each animation frame. Pointer and drag/drop interactions call store actions such as `addComponent`, `moveComponent`, `addWire`, and `removeComponent`. The same store viewport controls renderer pan and zoom.

Projects use a JSON wrapper with `schemaVersion: 1`, `project`, `probes`, and `viewport`. Browser saving downloads this format; loading validates circuit, pin, and wire references before replacing store state. A separate local autosave is used only for recovery.

The ECS module remains a standalone tested utility and is not part of the editor or renderer hot path. The active routing implementation is `src/engine/routing/wireRouter.ts`.
