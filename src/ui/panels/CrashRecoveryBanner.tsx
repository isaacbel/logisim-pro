import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { getAutosavedProject, clearProjectAutosave } from '@core/project/projectBackup';
import { useAppStore } from '@state/store';

export function CrashRecoveryBanner() {
  const [recoveryData, setRecoveryData] = useState<ReturnType<typeof getAutosavedProject> | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { setProject } = useAppStore();

  useEffect(() => {
    const autosave = getAutosavedProject();
    if (autosave && autosave.meta.componentCount > 0) {
      setRecoveryData(autosave);
    }
  }, []);

  if (!recoveryData || dismissed) return null;

  const handleRestore = () => {
    setProject(recoveryData.file.project);
    setDismissed(true);
  };

  const handleDiscard = () => {
    clearProjectAutosave();
    setDismissed(true);
  };

  const dateStr = new Date(recoveryData.meta.timestamp).toLocaleTimeString();

  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 border-b border-amber-500/40 text-amber-100 px-4 py-2 flex items-center justify-between shadow-lg z-40 text-xs animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong className="font-semibold text-amber-200">Unsaved Project Recovered:</strong>{' '}
          "{recoveryData.meta.projectName}" ({recoveryData.meta.componentCount} components, autosaved at {dateStr}).
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRestore}
          className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3 h-3" /> Restore Work
        </button>
        <button
          onClick={handleDiscard}
          className="px-2.5 py-1 rounded bg-amber-900/80 hover:bg-amber-800 text-amber-200 font-medium transition-colors"
        >
          Discard
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
