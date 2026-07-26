# codex-zotero-bridge

Minimal Zotero Desktop plugin for adding existing Zotero items to an existing collection.

This bridge exists because Zotero's local HTTP API is read-only for the operation needed by the citation workflow. It does not edit `zotero.sqlite` directly.

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\codex-zotero-bridge\build.ps1
```

Output:

```text
codex-zotero-bridge\codex-zotero-bridge.xpi
```

Plugin id:

```text
codex-zotero-bridge@codex.example.com
```

## Install In Zotero

1. Open Zotero Desktop.
2. Go to `Tools` -> `Add-ons`.
3. Use the gear menu and choose `Install Add-on From File...`.
4. Select `C:\Users\19144\Desktop\paper-test-0521\codex-zotero-bridge\codex-zotero-bridge.xpi`.
5. Restart Zotero if Zotero asks for it.

## Test

```powershell
python .\codex-zotero-bridge\call_bridge.py status
```

Expected response:

```json
{
  "ok": true,
  "plugin": "codex-zotero-bridge",
  "version": "0.1.0"
}
```

## Add Existing Items To `codex-zotero-plugin`

Target collection key:

```text
DZR22PSH
```

Items currently known to need this operation:

```powershell
python .\codex-zotero-bridge\call_bridge.py add-items-to-collection --collection-key DZR22PSH SFHLND8Z YD2UINJR JFKXPZJ8 PBYD7XVY WJTZ89D9
```

The endpoint only appends items to the existing collection. It does not create collections, delete anything, or remove items from any other collection.
