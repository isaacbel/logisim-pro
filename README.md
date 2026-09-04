# Logisim Pro

Logisim Pro is a TypeScript/React digital-logic editor with a Canvas 2D renderer and an event-driven simulation engine running in a Web Worker.

## Features

- Add components from the palette or by drag-and-drop.
- Select, move (grid snapped), delete, copy/paste, undo, redo, and wire components.
- Run, pause, step, reset, and change simulation speed through a Web Worker.
- Simulate gates, switches, LEDs, probes, and edge-triggered D/JK/T flip-flops.
- Generate truth tables, K-maps, and Boolean algebra with the engine modules.
- Save/open versioned JSON projects in the browser with local autosave recovery.

## Development

```bash
npm install
npm run dev
npm test -- --run
npm run build:renderer
```

`npm run build` also invokes Electron packaging. It needs the platform tooling required by `electron-builder`.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md). This project uses Canvas 2D; PixiJS and the ECS are not part of the active runtime path.

## License

MIT
