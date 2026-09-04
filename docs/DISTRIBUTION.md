# Logisim Pro — Distribution, Installation & Release System

Logisim Pro is designed for seamless cross-platform deployment across three distribution tiers:

1. **Windows Desktop Application (NSIS Installer)** — Local offline installation with desktop shortcuts, Start Menu entry, and `.lpro` file associations.
2. **Windows Portable Application (Zero-Install)** — Standalone single-file `.exe` running directly from USB flash drives on lab computers without requiring administrative privileges.
3. **Progressive Web App (PWA) / Web Edition** — Zero-setup web application deployable on GitHub Pages, Netlify, Vercel, or university intranets with 100% offline ServiceWorker caching.

---

## 1. Distribution Matrix

| Feature | Windows Desktop Installer | Windows Portable | Web / PWA Edition |
| :--- | :---: | :---: | :---: |
| **Output File** | `Logisim-Pro-Setup-x64.exe` | `Logisim-Pro-Portable-x64.exe` | Static `dist/` bundle |
| **Offline Capability** | 100% Offline | 100% Offline | 100% Offline (Service Worker) |
| **Installation Required** | Yes (User or All Users) | No (Run anywhere) | No (Browser / Add to Desktop) |
| **Admin Rights Needed** | Optional (Per-user default) | No | No |
| **File Association (.lpro)** | Automatic Windows Registry | Manual "Open With" | File Picker / Drag & Drop |
| **Native Save / Open Dialogs** | Native OS Dialogs | Native OS Dialogs | Browser File Access API |
| **Autosave & Persistence** | Local AppData / UserData | Portable `logisim-pro-data/` | IndexedDB Storage |
| **8086 Assembly / Emulation** | Fully Local | Fully Local | Fully Local (Web Worker) |

---

## 2. Building Desktop Releases

### Prerequisites
- Node.js 18+ and npm
- Windows 10/11 x64

### Build Commands

```bash
# 1. Build all distribution artifacts (Installer + Portable)
npm run dist:all

# 2. Build NSIS Windows Desktop Setup (.exe)
npm run dist:win

# 3. Build Windows Portable Zero-Install (.exe)
npm run dist:portable

# 4. Pack unpackaged application directory (for rapid testing)
npm run pack:dir
```

All built binaries are output to the `./release/` directory:
- `release/Logisim-Pro-Setup-x64.exe`
- `release/Logisim-Pro-Portable-x64.exe`
- `release/win-unpacked/Logisim Pro.exe`

---

## 3. Web & PWA Self-Hosting Guide

Universities, professors, and lab instructors can host Logisim Pro on their own web infrastructure:

```bash
# Build static web distribution bundle
npm run build:web
```

The resulting `dist/` directory contains standard static HTML, CSS, JavaScript, WebAssembly workers, and Service Worker assets.

### Deploying to GitHub Pages
1. Push `dist/` to your `gh-pages` branch or configure GitHub Actions to deploy from `dist`.
2. Ensure HTTPS is enabled (required for PWA Service Workers).

### Deploying to Nginx / Apache
```nginx
server {
    listen 443 ssl http2;
    server_name logisim.university.edu;

    root /var/www/logisim-pro/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable aggressive caching for immutable assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|wasm)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 4. Student Sharing & Collaboration

### Share via URL Link
Students can click **Import / Export Center → Student Share Link → Copy Shareable URL**.
The full circuit schematic and component state is encoded into the URL hash (`#share=...`). Any student or teacher opening the link will instantly load the circuit without uploading files to any server.

### File Format Specification (`.lpro`)
Logisim Pro uses standard, human-readable JSON project files conforming to schema version 1:
```json
{
  "formatVersion": 1,
  "generator": "Logisim Pro",
  "metadata": {
    "name": "Full Adder Subsystem",
    "description": "4-bit arithmetic unit",
    "author": "Student",
    "created": 1724450000000,
    "lastModified": 1724451000000
  },
  "project": {
    "id": "proj-uuid",
    "name": "Full Adder Subsystem",
    "mainCircuitId": "circ-main",
    "circuits": [ ... ]
  },
  "probes": [ ... ],
  "viewport": {
    "transform": { "x": 0, "y": 0, "scale": 1, "rotation": 0 },
    "width": 1920,
    "height": 1080,
    "showGrid": true,
    "gridSize": 20,
    "snapToGrid": true
  }
}
```

---

## 5. Security & Isolation Guarantee
- **Electron Context Isolation**: `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: false` with strictly typed IPC bridges.
- **Service Worker Sandbox**: Only caches origin assets; no external telemetry or tracking.
- **Zero Cloud Requirement**: The entire simulation engine runs completely offline with no network dependencies.
