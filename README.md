# Quick Start

## Requirements

- Node.js 18+
- npm

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal ( usually http://localhost:5173/layer-list/ ).

## URL Query Parameters

- `webmap`
  - ArcGIS Web Map item ID to load.
  - Default: `512944c00f8a4219a4bb70691089c9e9`.
- `portal`
  - Portal host or full URL used for `config.portalUrl`.
  - Default: `maps.arcgis.com`.
  - If protocol is omitted (for example `maps.arcgis.com`), the app uses `https://`.

Examples:

```text
http://localhost:5173/layer-list/
http://localhost:5173/layer-list/?portal=maps.arcgis.com&webmap=512944c00f8a4219a4bb70691089c9e9
http://localhost:5173/layer-list/?webmap=512944c00f8a4219a4bb70691089c9e9
http://localhost:5173/layer-list/?portal=https://maps.arcgis.com&webmap=512944c00f8a4219a4bb70691089c9e9
http://localhost:5173/layer-list/?portal=devtesting.mapsdevext.arcgis.com&webmap=de3f4458283a40f6aa06431abfbff538
```

## Deployment

GitHub Pages: https://sagewall.github.io/layer-list/

Examples:

```text
https://sagewall.github.io/layer-list/layer-list/
https://sagewall.github.io/layer-list/?portal=maps.arcgis.com&webmap=512944c00f8a4219a4bb70691089c9e9
https://sagewall.github.io/layer-list/?webmap=512944c00f8a4219a4bb70691089c9e9
https://sagewall.github.io/layer-list/?portal=https://maps.arcgis.com&webmap=512944c00f8a4219a4bb70691089c9e9
https://sagewall.github.io/layer-list/?portal=devtesting.mapsdevext.arcgis.com&webmap=de3f4458283a40f6aa06431abfbff538
```

## Other Useful Commands

```bash
npm run build
npm run preview
```
