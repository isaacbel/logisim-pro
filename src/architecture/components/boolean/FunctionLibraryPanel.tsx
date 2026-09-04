// ─────────────────────────────────────────────────────────────────────────────
// FunctionLibraryPanel — Standard Digital Logic Templates & User Functions
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  BUILTIN_TEMPLATES,
  FunctionLibraryEntry,
  getUserFunctions,
  saveUserFunction,
  deleteUserFunction,
  exportFunctionLibrary,
  importFunctionLibrary,
} from '@engine/analysis/boolean/functionLibrary';
import { BookOpen, Plus, Trash2, Download, Upload, ArrowRight } from 'lucide-react';

interface FunctionLibraryPanelProps {
  onLoadExpression: (expr: string) => void;
  currentExpression: string;
}

export function FunctionLibraryPanel({
  onLoadExpression,
  currentExpression,
}: FunctionLibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [userFunctions, setUserFunctions] = useState<FunctionLibraryEntry[]>(getUserFunctions());
  const [saveName, setSaveName] = useState<string>('');
  const [saveCategory, setSaveCategory] = useState<string>('Mes Fonctions');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const allEntries = [...BUILTIN_TEMPLATES, ...userFunctions];

  const categories = ['Tous', ...Array.from(new Set(allEntries.map(e => e.category)))];

  const filtered = activeCategory === 'Tous'
    ? allEntries
    : allEntries.filter(e => e.category === activeCategory);

  const handleSave = () => {
    if (!saveName.trim() || !currentExpression.trim()) return;
    saveUserFunction({
      name: saveName.trim(),
      category: saveCategory.trim() || 'Mes Fonctions',
      description: `Fonction utilisateur : ${currentExpression}`,
      inputs: Array.from(new Set(currentExpression.match(/[A-Z]/g) ?? ['A'])).sort(),
      outputs: [{ name: 'F', expression: currentExpression, description: 'Sortie principale' }],
      tags: ['custom'],
    });
    setUserFunctions(getUserFunctions());
    setSaveName('');
    setIsSaving(false);
  };

  const handleDelete = (id: string) => {
    deleteUserFunction(id);
    setUserFunctions(getUserFunctions());
  };

  const handleExport = () => {
    const json = exportFunctionLibrary();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'logisim_boolean_functions.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) {
        importFunctionLibrary(text);
        setUserFunctions(getUserFunctions());
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Bibliothèque de Fonctions &amp; Modèles Numériques
            </h3>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            17 circuits pédagogiques standards (Adders, MUX, Encodeurs, etc.) et sauvegarde de vos fonctions réutilisables.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setIsSaving(s => !s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--accent)',
              background: 'rgba(59,130,246,0.12)',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Sauvegarder la fonction actuelle
          </button>
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Download size={12} /> Exporter
          </button>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Upload size={12} /> Importer
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Save Modal Inline */}
      {isSaving && (
        <div style={{
          background: 'var(--surface-2)',
          padding: 14,
          borderRadius: 8,
          border: '1px solid var(--accent)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
            Sauvegarder l'expression actuelle dans votre bibliothèque
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Nom de la fonction (ex: Encodeur BCD)"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface-1)',
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
            <input
              type="text"
              placeholder="Catégorie (ex: Mes Fonctions)"
              value={saveCategory}
              onChange={e => setSaveCategory(e.target.value)}
              style={{
                width: 160,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface-1)',
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
            <button
              onClick={handleSave}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Categories Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
              background: activeCategory === cat ? 'var(--accent)' : 'var(--surface-2)',
              color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: activeCategory === cat ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(entry => (
          <div
            key={entry.id}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {entry.name}
                </span>
                {!entry.isBuiltin && (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    title="Supprimer"
                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 8 }}>
                {entry.description}
              </div>

              {/* Outputs list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {entry.outputs.map(out => (
                  <div
                    key={out.name}
                    style={{
                      background: 'var(--surface-1)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: 'var(--accent)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{out.name} = {out.expression}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onLoadExpression(entry.outputs[0]?.expression ?? '')}
              style={{
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(59,130,246,0.3)',
                background: 'rgba(59,130,246,0.12)',
                color: 'var(--accent)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>Charger dans le lab</span>
              <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
