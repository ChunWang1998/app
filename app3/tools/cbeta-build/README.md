# CBETA corpus build (app3)

Transforms CBETA (or curated starter) text into offline copy units for the mobile app.

## Starter pack (bundled in app)

```bash
cd app3/tools/cbeta-build
npm run build:starter
```

Output: `app3/mobile/assets/corpus/starter/` (`manifest.json`, `catalog.json`, `units/*.json`).

Edit `starter-sutras.source.mjs` (curated excerpts + zhuyin), then rebuild.

## Full corpus (CDN — not in app binary)

1. Download CBETA plain text (see `download-cbeta.sh`). Work ids are plain form, e.g. `T0251` (not `T08n0251`).
   - CBETA API: https://cbdata.dila.edu.tw/stable/static_pages/download
2. Set version: `CBETA_VERSION=2026R1 npm run build:full`
3. Deploy `app3/corpus-dist/full/` to object storage + CDN.
4. Set `EXPO_PUBLIC_CORPUS_CDN_BASE` in the mobile app to the deployed base URL.

Canonical IDs match the full pack / R2 (`T0251`). XML-style ids (`T08n0251`) are mapped in the app via `resolveWorkId`.

## Sentence splitting

`lib/split-sentences.mjs` splits on `。！？；`. For 偈頌 / complex layout, preprocess from CBETA HTML/XML before plain-text export.
