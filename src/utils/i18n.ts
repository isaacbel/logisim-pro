/**
 * Internationalization (i18n) System
 * Supports: English, French, Arabic (RTL), Spanish, German, Japanese
 */

import type { AppLanguage } from '@apptypes/core';

export type TranslationKey =
  | 'file' | 'edit' | 'view' | 'simulate' | 'help'
  | 'newProject' | 'openProject' | 'saveProject' | 'saveAs' | 'exportPNG' | 'exportSVG' | 'exportJSON'
  | 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'delete' | 'selectAll'
  | 'run' | 'pause' | 'step' | 'reset' | 'speed'
  | 'gates' | 'inputs' | 'outputs' | 'memory' | 'arithmetic' | 'plexers' | 'wiring' | 'clock' | 'custom'
  | 'properties' | 'waveform' | 'truthTable' | 'kmap' | 'booleanAlgebra' | 'console' | 'cpuBuilder'
  | 'components' | 'searchComponents'
  | 'zoom' | 'fit' | 'grid' | 'minimap' | 'theme' | 'darkMode' | 'lightMode' | 'glassMode'
  | 'settings' | 'language' | 'about'
  | 'tick' | 'frequency' | 'delay' | 'running' | 'paused' | 'stepped'
  | 'hazard' | 'oscillation' | 'error' | 'warning' | 'success'
  | 'noSelection' | 'selectedComponent' | 'addProbe' | 'removeProbe'
  | 'label' | 'bitWidth' | 'enabled'
  | 'export' | 'import' | 'cancel' | 'apply' | 'ok' | 'close';

type Translations = Record<TranslationKey, string>;

const translations: Record<AppLanguage, Translations> = {
  en: {
    file: 'File', edit: 'Edit', view: 'View', simulate: 'Simulate', help: 'Help',
    newProject: 'New Project', openProject: 'Open Project', saveProject: 'Save', saveAs: 'Save As',
    exportPNG: 'Export PNG', exportSVG: 'Export SVG', exportJSON: 'Export JSON',
    undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', delete: 'Delete', selectAll: 'Select All',
    run: 'Run', pause: 'Pause', step: 'Step', reset: 'Reset', speed: 'Speed',
    gates: 'Gates', inputs: 'Inputs', outputs: 'Outputs', memory: 'Memory',
    arithmetic: 'Arithmetic', plexers: 'Plexers', wiring: 'Wiring', clock: 'Clock', custom: 'Custom',
    properties: 'Properties', waveform: 'Waveform', truthTable: 'Truth Table',
    kmap: 'K-Map', booleanAlgebra: 'Boolean Algebra', console: 'Console', cpuBuilder: 'CPU Builder',
    components: 'Components', searchComponents: 'Search components…',
    zoom: 'Zoom', fit: 'Fit Screen', grid: 'Grid', minimap: 'Minimap', theme: 'Theme',
    darkMode: 'Dark', lightMode: 'Light', glassMode: 'Glass',
    settings: 'Settings', language: 'Language', about: 'About',
    tick: 'Tick', frequency: 'Frequency', delay: 'Propagation Delay', running: 'Running', paused: 'Paused', stepped: 'Stepped',
    hazard: 'Hazard', oscillation: 'Oscillation', error: 'Error', warning: 'Warning', success: 'Success',
    noSelection: 'No component selected', selectedComponent: 'Component', addProbe: 'Add Probe', removeProbe: 'Remove Probe',
    label: 'Label', bitWidth: 'Bit Width', enabled: 'Enabled',
    export: 'Export', import: 'Import', cancel: 'Cancel', apply: 'Apply', ok: 'OK', close: 'Close',
  },
  fr: {
    file: 'Fichier', edit: 'Édition', view: 'Affichage', simulate: 'Simuler', help: 'Aide',
    newProject: 'Nouveau projet', openProject: 'Ouvrir', saveProject: 'Enregistrer', saveAs: 'Enregistrer sous',
    exportPNG: 'Exporter PNG', exportSVG: 'Exporter SVG', exportJSON: 'Exporter JSON',
    undo: 'Annuler', redo: 'Rétablir', cut: 'Couper', copy: 'Copier', paste: 'Coller', delete: 'Supprimer', selectAll: 'Tout sélectionner',
    run: 'Démarrer', pause: 'Pause', step: 'Pas', reset: 'Réinitialiser', speed: 'Vitesse',
    gates: 'Portes', inputs: 'Entrées', outputs: 'Sorties', memory: 'Mémoire',
    arithmetic: 'Arithmétique', plexers: 'Multiplexeurs', wiring: 'Câblage', clock: 'Horloge', custom: 'Personnalisé',
    properties: 'Propriétés', waveform: 'Oscillogramme', truthTable: 'Table de vérité',
    kmap: 'K-Map', booleanAlgebra: 'Algèbre booléenne', console: 'Console', cpuBuilder: 'Constructeur CPU',
    components: 'Composants', searchComponents: 'Rechercher composants…',
    zoom: 'Zoom', fit: "Ajuster l'écran", grid: 'Grille', minimap: 'Minicarte', theme: 'Thème',
    darkMode: 'Sombre', lightMode: 'Clair', glassMode: 'Verre',
    settings: 'Paramètres', language: 'Langue', about: 'À propos',
    tick: 'Tick', frequency: 'Fréquence', delay: 'Délai de propagation', running: 'En cours', paused: 'En pause', stepped: 'Pas à pas',
    hazard: 'Aléa', oscillation: 'Oscillation', error: 'Erreur', warning: 'Avertissement', success: 'Succès',
    noSelection: 'Aucun composant sélectionné', selectedComponent: 'Composant', addProbe: 'Ajouter sonde', removeProbe: 'Retirer sonde',
    label: 'Étiquette', bitWidth: 'Largeur de bit', enabled: 'Activé',
    export: 'Exporter', import: 'Importer', cancel: 'Annuler', apply: 'Appliquer', ok: 'OK', close: 'Fermer',
  },
  ar: {
    file: 'ملف', edit: 'تعديل', view: 'عرض', simulate: 'محاكاة', help: 'مساعدة',
    newProject: 'مشروع جديد', openProject: 'فتح', saveProject: 'حفظ', saveAs: 'حفظ باسم',
    exportPNG: 'تصدير PNG', exportSVG: 'تصدير SVG', exportJSON: 'تصدير JSON',
    undo: 'تراجع', redo: 'إعادة', cut: 'قص', copy: 'نسخ', paste: 'لصق', delete: 'حذف', selectAll: 'تحديد الكل',
    run: 'تشغيل', pause: 'إيقاف مؤقت', step: 'خطوة', reset: 'إعادة تعيين', speed: 'السرعة',
    gates: 'البوابات', inputs: 'المدخلات', outputs: 'المخرجات', memory: 'الذاكرة',
    arithmetic: 'الحسابية', plexers: 'المتشعبات', wiring: 'التوصيلات', clock: 'الساعة', custom: 'مخصص',
    properties: 'الخصائص', waveform: 'شكل الموجة', truthTable: 'جدول الحقيقة',
    kmap: 'خريطة كارنو', booleanAlgebra: 'الجبر البولياني', console: 'وحدة التحكم', cpuBuilder: 'باني المعالج',
    components: 'المكونات', searchComponents: 'بحث في المكونات…',
    zoom: 'تكبير', fit: 'ملاءمة الشاشة', grid: 'شبكة', minimap: 'خريطة مصغرة', theme: 'مظهر',
    darkMode: 'داكن', lightMode: 'فاتح', glassMode: 'زجاج',
    settings: 'الإعدادات', language: 'اللغة', about: 'حول',
    tick: 'دورة', frequency: 'التردد', delay: 'تأخير الانتشار', running: 'يعمل', paused: 'متوقف مؤقتاً', stepped: 'خطوة بخطوة',
    hazard: 'خطر', oscillation: 'تذبذب', error: 'خطأ', warning: 'تحذير', success: 'نجاح',
    noSelection: 'لم يتم تحديد مكون', selectedComponent: 'مكون', addProbe: 'إضافة مسبار', removeProbe: 'إزالة مسبار',
    label: 'تسمية', bitWidth: 'عرض البت', enabled: 'مفعّل',
    export: 'تصدير', import: 'استيراد', cancel: 'إلغاء', apply: 'تطبيق', ok: 'موافق', close: 'إغلاق',
  },
  es: {
    file: 'Archivo', edit: 'Editar', view: 'Ver', simulate: 'Simular', help: 'Ayuda',
    newProject: 'Nuevo proyecto', openProject: 'Abrir', saveProject: 'Guardar', saveAs: 'Guardar como',
    exportPNG: 'Exportar PNG', exportSVG: 'Exportar SVG', exportJSON: 'Exportar JSON',
    undo: 'Deshacer', redo: 'Rehacer', cut: 'Cortar', copy: 'Copiar', paste: 'Pegar', delete: 'Eliminar', selectAll: 'Seleccionar todo',
    run: 'Ejecutar', pause: 'Pausar', step: 'Paso', reset: 'Reiniciar', speed: 'Velocidad',
    gates: 'Puertas', inputs: 'Entradas', outputs: 'Salidas', memory: 'Memoria',
    arithmetic: 'Aritmética', plexers: 'Plexers', wiring: 'Cableado', clock: 'Reloj', custom: 'Personalizado',
    properties: 'Propiedades', waveform: 'Forma de onda', truthTable: 'Tabla de verdad',
    kmap: 'Mapa K', booleanAlgebra: 'Álgebra booleana', console: 'Consola', cpuBuilder: 'Constructor CPU',
    components: 'Componentes', searchComponents: 'Buscar componentes…',
    zoom: 'Zoom', fit: 'Ajustar pantalla', grid: 'Cuadrícula', minimap: 'Minimapa', theme: 'Tema',
    darkMode: 'Oscuro', lightMode: 'Claro', glassMode: 'Cristal',
    settings: 'Configuración', language: 'Idioma', about: 'Acerca de',
    tick: 'Ciclo', frequency: 'Frecuencia', delay: 'Retardo de propagación', running: 'Ejecutando', paused: 'Pausado', stepped: 'Paso a paso',
    hazard: 'Peligro', oscillation: 'Oscilación', error: 'Error', warning: 'Advertencia', success: 'Éxito',
    noSelection: 'Sin componente seleccionado', selectedComponent: 'Componente', addProbe: 'Añadir sonda', removeProbe: 'Eliminar sonda',
    label: 'Etiqueta', bitWidth: 'Ancho de bit', enabled: 'Habilitado',
    export: 'Exportar', import: 'Importar', cancel: 'Cancelar', apply: 'Aplicar', ok: 'OK', close: 'Cerrar',
  },
  de: {
    file: 'Datei', edit: 'Bearbeiten', view: 'Ansicht', simulate: 'Simulieren', help: 'Hilfe',
    newProject: 'Neues Projekt', openProject: 'Öffnen', saveProject: 'Speichern', saveAs: 'Speichern unter',
    exportPNG: 'PNG exportieren', exportSVG: 'SVG exportieren', exportJSON: 'JSON exportieren',
    undo: 'Rückgängig', redo: 'Wiederholen', cut: 'Ausschneiden', copy: 'Kopieren', paste: 'Einfügen', delete: 'Löschen', selectAll: 'Alles auswählen',
    run: 'Ausführen', pause: 'Pause', step: 'Schritt', reset: 'Zurücksetzen', speed: 'Geschwindigkeit',
    gates: 'Gatter', inputs: 'Eingaben', outputs: 'Ausgaben', memory: 'Speicher',
    arithmetic: 'Arithmetik', plexers: 'Plexer', wiring: 'Verdrahtung', clock: 'Takt', custom: 'Benutzerdefiniert',
    properties: 'Eigenschaften', waveform: 'Wellenform', truthTable: 'Wahrheitstabelle',
    kmap: 'KV-Diagramm', booleanAlgebra: 'Boolesche Algebra', console: 'Konsole', cpuBuilder: 'CPU-Builder',
    components: 'Komponenten', searchComponents: 'Komponenten suchen…',
    zoom: 'Zoom', fit: 'Bildschirm anpassen', grid: 'Raster', minimap: 'Miniaturkarte', theme: 'Design',
    darkMode: 'Dunkel', lightMode: 'Hell', glassMode: 'Glas',
    settings: 'Einstellungen', language: 'Sprache', about: 'Über',
    tick: 'Takt', frequency: 'Frequenz', delay: 'Ausbreitungsverzögerung', running: 'Läuft', paused: 'Pausiert', stepped: 'Schrittweise',
    hazard: 'Hazard', oscillation: 'Oszillation', error: 'Fehler', warning: 'Warnung', success: 'Erfolg',
    noSelection: 'Keine Komponente ausgewählt', selectedComponent: 'Komponente', addProbe: 'Sonde hinzufügen', removeProbe: 'Sonde entfernen',
    label: 'Bezeichnung', bitWidth: 'Bitbreite', enabled: 'Aktiviert',
    export: 'Exportieren', import: 'Importieren', cancel: 'Abbrechen', apply: 'Anwenden', ok: 'OK', close: 'Schließen',
  },
  ja: {
    file: 'ファイル', edit: '編集', view: '表示', simulate: 'シミュレート', help: 'ヘルプ',
    newProject: '新規プロジェクト', openProject: '開く', saveProject: '保存', saveAs: '名前を付けて保存',
    exportPNG: 'PNG書き出し', exportSVG: 'SVG書き出し', exportJSON: 'JSON書き出し',
    undo: '元に戻す', redo: 'やり直し', cut: '切り取り', copy: 'コピー', paste: '貼り付け', delete: '削除', selectAll: 'すべて選択',
    run: '実行', pause: '一時停止', step: 'ステップ', reset: 'リセット', speed: '速度',
    gates: 'ゲート', inputs: '入力', outputs: '出力', memory: 'メモリ',
    arithmetic: '算術', plexers: 'プレクサ', wiring: '配線', clock: 'クロック', custom: 'カスタム',
    properties: 'プロパティ', waveform: '波形', truthTable: '真理値表',
    kmap: 'Kマップ', booleanAlgebra: 'ブール代数', console: 'コンソール', cpuBuilder: 'CPUビルダー',
    components: 'コンポーネント', searchComponents: 'コンポーネントを検索…',
    zoom: 'ズーム', fit: '画面に合わせる', grid: 'グリッド', minimap: 'ミニマップ', theme: 'テーマ',
    darkMode: 'ダーク', lightMode: 'ライト', glassMode: 'ガラス',
    settings: '設定', language: '言語', about: 'について',
    tick: 'ティック', frequency: '周波数', delay: '伝播遅延', running: '実行中', paused: '一時停止中', stepped: 'ステップ実行',
    hazard: 'ハザード', oscillation: '発振', error: 'エラー', warning: '警告', success: '成功',
    noSelection: 'コンポーネントが選択されていません', selectedComponent: 'コンポーネント', addProbe: 'プローブ追加', removeProbe: 'プローブ削除',
    label: 'ラベル', bitWidth: 'ビット幅', enabled: '有効',
    export: 'エクスポート', import: 'インポート', cancel: 'キャンセル', apply: '適用', ok: 'OK', close: '閉じる',
  },
};

const RTL_LANGUAGES: AppLanguage[] = ['ar'];

let currentLanguage: AppLanguage = 'en';

export function setLanguage(lang: AppLanguage): void {
  currentLanguage = lang;
  // Apply RTL/LTR to document root
  if (typeof document !== 'undefined') {
    document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
}

export function getLanguage(): AppLanguage {
  return currentLanguage;
}

export function isRTL(): boolean {
  return RTL_LANGUAGES.includes(currentLanguage);
}

export function t(key: TranslationKey): string {
  return translations[currentLanguage][key] ?? translations.en[key] ?? key;
}

export function getTranslations(lang: AppLanguage): Translations {
  return translations[lang];
}
