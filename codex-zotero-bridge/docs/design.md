# codex-zotero-bridge Design

`codex-zotero-bridge` is a minimal Zotero Desktop plugin for one missing operation in the Codex workflow:

```text
Add existing Zotero items to an existing Zotero collection.
```

It does not import RIS, export BibTeX, read PDFs, create collections, delete collections, delete items, or execute arbitrary JavaScript.

## Endpoints

The plugin listens only on localhost:

```text
http://127.0.0.1:23120
```

### GET /status

Returns plugin readiness.

```json
{
  "ok": true,
  "plugin": "codex-zotero-bridge",
  "version": "0.1.0"
}
```

### POST /get-item-collections

Request:

```json
{
  "itemKeys": ["SFHLND8Z", "YD2UINJR"]
}
```

Response:

```json
{
  "ok": true,
  "items": [
    {
      "itemKey": "SFHLND8Z",
      "collections": ["LKQWHGVX", "4DP26NHX"]
    }
  ],
  "notFound": []
}
```

### POST /add-items-to-collection

Request:

```json
{
  "collectionKey": "DZR22PSH",
  "itemKeys": ["SFHLND8Z", "YD2UINJR"]
}
```

Response:

```json
{
  "ok": true,
  "collectionKey": "DZR22PSH",
  "added": ["SFHLND8Z", "YD2UINJR"],
  "alreadyPresent": [],
  "notFound": [],
  "errors": []
}
```

## Safety Rules

- Listen only on `127.0.0.1`.
- Do not create collections.
- Do not delete items or collections.
- Do not remove items from any existing collection.
- Do not expose arbitrary JavaScript execution.
- Only append the target collection key to an item's existing collection list.
- Return detailed results for logging in `turn-N/import-reports/official-ris-import-report-turn-N.md`.

## Relation To The Skill

`zotero-citation-verification` should use this bridge only when a Zotero DOI-exact match already exists and needs to be added to the target collection.

If this bridge is unavailable, the skill must fall back to Zotero Desktop GUI action or user action. Direct `zotero.sqlite` writes remain forbidden.

