import { useEffect } from 'react';
import { useAppStore } from '@state/store';
import { Scissors, Copy, Clipboard, CopyPlus, RotateCw, Trash2, Cpu } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const {
    selection,
    cutSelected,
    copySelected,
    paste,
    duplicateSelected,
    rotateSelectedComponents,
    deleteSelected,
    editor,
  } = useAppStore();

  const hasSelection = selection.selectedEntityIds.size > 0 || selection.selectedWireIds.size > 0;
  const hasClipboard = Boolean(editor.clipboard);

  useEffect(() => {
    function handleClickOutside() {
      onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const items = [
    {
      label: 'Cut',
      icon: Scissors,
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      action: () => { cutSelected(); onClose(); },
    },
    {
      label: 'Copy',
      icon: Copy,
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      action: () => { copySelected(); onClose(); },
    },
    {
      label: 'Paste',
      icon: Clipboard,
      shortcut: 'Ctrl+V',
      disabled: !hasClipboard,
      action: () => { paste(); onClose(); },
    },
    {
      label: 'Duplicate',
      icon: CopyPlus,
      shortcut: 'Ctrl+D',
      disabled: !hasSelection,
      action: () => { duplicateSelected(); onClose(); },
    },
    { type: 'divider' },
    {
      label: 'Rotate 90°',
      icon: RotateCw,
      shortcut: 'R',
      disabled: !hasSelection,
      action: () => { rotateSelectedComponents(90); onClose(); },
    },
    { type: 'divider' },
    {
      label: 'Analyze in Architecture Lab',
      icon: Cpu,
      shortcut: '',
      disabled: !hasSelection,
      action: () => {
        const s = useAppStore.getState();
        const circuit = s.project?.circuits.find(c => c.id === s.currentCircuitId);
        let bitStr = '11010110';
        if (circuit) {
          const selected = circuit.components.filter(c => s.selection.selectedEntityIds.has(c.id));
          if (selected.length > 0) {
            const bits: number[] = [];
            selected.forEach(c => {
              if (c.type === 'CONSTANT_1') bits.push(1);
              else if (c.type === 'CONSTANT_0') bits.push(0);
              else if (c.type === 'SWITCH') bits.push(c.properties?.state === 1 ? 1 : 0);
            });
            if (bits.length > 0) bitStr = bits.join('');
          }
        }
        s.setArchInspectorValue(bitStr);
        s.setAppMode('architecture');
        s.setArchPage('dashboard');
        onClose();
      },
    },
    { type: 'divider' },
    {
      label: 'Delete',
      icon: Trash2,
      shortcut: 'Del',
      disabled: !hasSelection,
      danger: true,
      action: () => { deleteSelected(); onClose(); },
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        background: 'var(--panel-bg, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: 8,
        padding: '4px 0',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        minWidth: 190,
        fontSize: 12,
        userSelect: 'none',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {items.map((item, idx) => {
        if (item.type === 'divider') {
          return (
            <div key={idx} style={{ height: 1, background: 'var(--border, #334155)', margin: '4px 0' }} />
          );
        }

        const Icon = item.icon!;
        return (
          <button
            key={idx}
            onClick={item.action}
            disabled={item.disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '6px 12px',
              border: 'none',
              background: 'transparent',
              color: item.disabled
                ? 'var(--text-muted, #64748b)'
                : item.danger
                  ? '#ef4444'
                  : 'var(--text-primary, #f8fafc)',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontSize: 12,
            }}
            onMouseEnter={e => {
              if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover, rgba(255,255,255,0.08))';
            }}
            onMouseLeave={e => {
              if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={13} />
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span style={{ fontSize: 10, color: 'var(--text-muted, #64748b)', fontFamily: 'monospace' }}>
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
