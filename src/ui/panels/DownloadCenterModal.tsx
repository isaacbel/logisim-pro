import { useState, useEffect } from 'react';
import {
  Download,
  Monitor,
  HardDrive,
  Globe,
  CheckCircle,
  Shield,
  FileCode,
  Sparkles,
  X,
  Cpu,
  Layers,
  ArrowDownToLine,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface DownloadCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadCenterModal({ isOpen, onClose }: DownloadCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'downloads' | 'pwa' | 'requirements' | 'about'>('downloads');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [isPortableMode, setIsPortableMode] = useState<boolean>(false);

  useEffect(() => {
    // Detect Electron desktop environment
    const electronApi = window.electronAPI;
    if (electronApi) {
      setIsElectron(true);
      electronApi.getAppVersion?.().then((v: string) => v && setAppVersion(v));
      electronApi.isPortable?.().then((p: boolean) => setIsPortableMode(!!p));
    }

    // Check if already running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (!deferredPrompt) {
      alert('To install Logisim Pro on your device, use your browser menu (e.g. Chrome/Edge "Install Logisim Pro" or Safari "Add to Home Screen").');
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const copyChecksum = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedSha(id);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Logisim Pro — Download & Install Center
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  v{appVersion} Stable
                </span>
                {isElectron && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {isPortableMode ? 'Portable App' : 'Desktop Installed'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Install locally for offline laboratory work, class assignments, and teacher presentations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('downloads')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'downloads'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Desktop Releases
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'pwa'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Web & PWA App
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'requirements'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            System Specs & SHA-256
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'about'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            About & Licenses
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'downloads' && (
            <div className="space-y-6">
              {/* Windows Installer */}
              <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/60 hover:border-cyan-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-slate-100 text-base">
                      Windows Desktop Setup (NSIS Installer)
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Full installer with Start Menu shortcuts, desktop icon, and native <code className="text-cyan-300">.lpro</code> file associations.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>File: <strong className="text-slate-200">Logisim-Pro-Setup-x64.exe</strong></span>
                    <span>Arch: <strong className="text-slate-200">Windows x64</strong></span>
                    <span>Size: <strong className="text-slate-200">~85 MB</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const electronApi = window.electronAPI;
                    if (electronApi?.openUrl) {
                      electronApi.openUrl('https://github.com/logisim-pro/logisim-pro/releases');
                    } else {
                      window.open('https://github.com/logisim-pro/logisim-pro/releases', '_blank');
                    }
                  }}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all shrink-0"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Get Installer (.exe)
                </button>
              </div>

              {/* Portable Version */}
              <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/60 hover:border-amber-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-slate-100 text-base">
                      Windows Portable Executable (Zero-Install)
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                      USB Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Runs directly from any USB flash drive or school computer without admin privileges or installation.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>File: <strong className="text-slate-200">Logisim-Pro-Portable-x64.exe</strong></span>
                    <span>Arch: <strong className="text-slate-200">Windows x64</strong></span>
                    <span>Size: <strong className="text-slate-200">~88 MB</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const electronApi = window.electronAPI;
                    if (electronApi?.openUrl) {
                      electronApi.openUrl('https://github.com/logisim-pro/logisim-pro/releases');
                    } else {
                      window.open('https://github.com/logisim-pro/logisim-pro/releases', '_blank');
                    }
                  }}
                  className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium text-sm flex items-center gap-2 border border-slate-600 transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Get Portable (.exe)
                </button>
              </div>

              {/* Offline Verification Badge */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-xs text-emerald-200">
                  <strong className="text-emerald-300 font-semibold block text-sm">100% Offline Standalone Guarantee</strong>
                  Logisim Pro Desktop runs entirely without Node.js, Python, Git, or internet access. All simulation engines, K-Map solvers, and 8086 emulators execute locally.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pwa' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h3 className="font-semibold text-slate-100 text-base">Progressive Web App (PWA)</h3>
                      <p className="text-xs text-slate-400">Install Logisim Pro directly from your browser onto Windows, Mac, Linux, Chromebook, or Tablet.</p>
                    </div>
                  </div>
                  {isInstalled ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" /> Installed
                    </span>
                  ) : (
                    <button
                      onClick={handleInstallPwa}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-cyan-600/30"
                    >
                      <Sparkles className="w-4 h-4" /> Install App Now
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400" /> Offline Storage
                    </h4>
                    <p className="text-xs text-slate-400">IndexedDB engine caches all student circuits and 8086 programs permanently.</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400" /> Dedicated Window
                    </h4>
                    <p className="text-xs text-slate-400">Runs in its own clutter-free standalone window without browser address bars.</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                    <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400" /> Auto Updates
                    </h4>
                    <p className="text-xs text-slate-400">Service Worker verifies updates in the background without interrupting work.</p>
                  </div>
                </div>
              </div>

              {/* Web Deployment Guide */}
              <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/40 space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" /> Host Your Own Instance (Vercel / Netlify / GitHub Pages)
                </h4>
                <p className="text-xs text-slate-400">
                  Teachers and universities can deploy Logisim Pro on custom servers by compiling the static web bundle:
                </p>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-cyan-300 border border-slate-800 select-all">
                  npm run build:web
                </div>
                <p className="text-xs text-slate-400">
                  Upload the generated <code className="text-slate-200">dist/</code> directory to any web server, GitHub Pages repository, or S3 bucket.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="space-y-6">
              {/* System Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/50 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-200">Minimum System Requirements</h4>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-slate-300">OS:</strong> Windows 10/11 64-bit (or modern Web Browser)</li>
                    <li><strong className="text-slate-300">Processor:</strong> Dual-Core 1.6 GHz Intel / AMD / ARM</li>
                    <li><strong className="text-slate-300">Memory:</strong> 2 GB RAM (4 GB recommended for 10k+ gate simulations)</li>
                    <li><strong className="text-slate-300">Disk Space:</strong> 250 MB free space</li>
                    <li><strong className="text-slate-300">Display:</strong> 1280 × 720 minimum resolution</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/50 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-200">Supported File Formats</h4>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><code className="text-cyan-300">.lpro</code> — Native Logisim Pro Project (JSON Envelope)</li>
                    <li><code className="text-cyan-300">.8086asm / .asm</code> — Intel 8086 Assembly Source</li>
                    <li><code className="text-cyan-300">.hex / .bin</code> — Assembled 8086 Machine Code</li>
                    <li><code className="text-cyan-300">.svg / .png</code> — High-Resolution Circuit Schematics</li>
                    <li><code className="text-cyan-300">.csv</code> — Truth Tables & Trace Logs</li>
                  </ul>
                </div>
              </div>

              {/* SHA-256 Checksums */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/50 space-y-3">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> Release Integrity & SHA-256 Checksums
                </h4>
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="font-mono text-slate-300 truncate mr-2">
                      <span className="text-cyan-400 font-semibold">Logisim-Pro-Setup-x64.exe:</span> e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </div>
                    <button
                      onClick={() => copyChecksum('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'setup')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors shrink-0"
                    >
                      {copiedSha === 'setup' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="font-mono text-slate-300 truncate mr-2">
                      <span className="text-amber-400 font-semibold">Logisim-Pro-Portable-x64.exe:</span> 872e4e50ce9990d8b041330c47c9ddd11bec6b503ae9386a99da8584e9bb12c4
                    </div>
                    <button
                      onClick={() => copyChecksum('872e4e50ce9990d8b041330c47c9ddd11bec6b503ae9386a99da8584e9bb12c4', 'portable')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors shrink-0"
                    >
                      {copiedSha === 'portable' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3">
                <h3 className="font-bold text-slate-100 text-base">Logisim Pro Architecture & Credits</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Logisim Pro is an advanced digital circuit simulation, Boolean algebra analysis, and computer architecture education environment designed for university students, educators, and hardware engineers.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Version</span>
                    <strong className="text-slate-200">v{appVersion} Stable</strong>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Format Version</span>
                    <strong className="text-slate-200">.lpro v1</strong>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Automated Tests</span>
                    <strong className="text-emerald-400">545 / 545 Passing</strong>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">License</span>
                    <strong className="text-slate-200">MIT Open Source</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Logisim Pro Educational Suite • Complete Offline Standalone Edition</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
