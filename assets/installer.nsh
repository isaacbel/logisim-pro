; Logisim Pro Custom NSIS Installer Script (installer.nsh)
; Additional install actions beyond electron-builder defaults.
; Place this file at assets/installer.nsh
;
; This file is intentionally minimal. Add custom registry entries or
; additional shortcuts here if needed in future releases.

; Example: Associate .lpro files with the app (electron-builder handles this
; via fileAssociations config, but this can be used for custom entries)

; !macro customInstall
;   WriteRegStr HKCU "Software\LogisimPro" "InstallDir" "$INSTDIR"
; !macroend

; !macro customUnInstall
;   DeleteRegKey HKCU "Software\LogisimPro"
; !macroend
