# Tanahku — Land Measurement via Satellite Imagery

> **Ukur Tanah via Citra Satelit** · *Measure land accurately using satellite imagery.*

A free, browser-based land measurement tool. Mark boundaries on a satellite map, get instant geodesic area/perimeter calculations, and export results as PDF or GeoJSON. No registration required.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Architecture](#architecture)
- [Measurement Accuracy](#measurement-accuracy)
- [Bilingual Support](#bilingual-support)
- [Security](#security)
- [Deployment](#deployment)
- [License](#license)

---

## Features

### Core
| Feature | Description |
|---------|-------------|
| **Satellite Map** | Esri, Google Satellite, OpenStreetMap, and Hybrid tile layers |
| **Polygon Drawing** | Click-to-draw boundary vertices; drag to edit; undo support |
| **Geodesic Measurements** | Area (m² / hectares / tumbak), perimeter, bounding-box dimensions via Turf.js |
| **Self-Intersection Detection** | Real-time polygon validation — red highlight + warning when edges cross |
| **Reverse Geocoding** | Auto-detects address, village, district, city, province, and postal code via OpenStreetMap Nominatim |
| **Accuracy Confidence** | 3-tier badge (High/Medium/Low) based on vertex count and area size |
| **Regional Units** | Indonesian *tumbak* adjusts per province (Jawa Barat=14 m², Bali=10 m², Lombok=12 m²) |

### Export & Share
| Feature | Description |
|---------|-------------|
| **PDF Report** | Multi-section report with map screenshot, measurements table, location info, QR code, and legal disclaimer |
| **GeoJSON Export** | Standard GeoJSON FeatureCollection for GIS import |
| **Native Share** | Web Share API with fallback to clipboard |
| **WhatsApp / Telegram** | One-click share with pre-filled text + coordinates |

### UX
| Feature | Description |
|---------|-------------|
| **Bilingual EN/ID** | Full UI translation with persistent language toggle |
| **Worldwide Search** | OpenStreetMap Nominatim search for any location globally |
| **GPS Locate** | Browser geolocation with high-accuracy mode |
| **Responsive Design** | Works on desktop, tablet, and mobile |
| **Error Boundary** | Graceful crash recovery with reload option |
| **Dark UI** | Glassmorphism aesthetic with emerald accent |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 with Hooks |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 3 + custom glassmorphism |
| **Map** | Leaflet 1.9 + React-Leaflet 4 |
| **Geospatial** | Turf.js 7 (geodesic area, distance, kinks, centroid, bbox) |
| **PDF** | jsPDF 4 (lazy-loaded) |
| **Screenshot** | html2canvas (lazy-loaded) |
| **Icons** | Lucide React |
| **Geocoding** | OpenStreetMap Nominatim API |
| **QR Code** | QR Server API |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Install

```bash
git clone https://github.com/leoui/tanahku.git
cd tanahku
npm install
```

### Development

```bash
npm run dev
# → http://localhost:3000
```

Vite serves with HMR (Hot Module Replacement). The dev server binds to `0.0.0.0` for LAN access.

### Production Build

```bash
npm run build
# → dist/

npm run preview
# → http://localhost:4173 (static preview)
```

The production build outputs to `dist/` with code-split chunks:

| Chunk | Size (gzip) | Load Strategy |
|-------|-------------|---------------|
| `leaflet` | 91 KB | Always loaded |
| `index` (React + UI) | 14 KB | Always loaded |
| `turf` | 2.6 KB | Always loaded |
| `pdf` (jsPDF + html2canvas) | 177 KB | **Lazy-loaded** on first PDF/Share click |

---

## Usage

### Measuring Land

1. **Search** for a location in the search bar (city, address, or coordinates)
2. Click **"Tandai Tanah"** / **"Mark Land"**
3. **Click on the map** to place boundary vertices (minimum 3)
4. Drag any vertex to fine-tune; use **Undo** to remove the last point
5. Click **"Selesai"** / **"Done"** to finalize

### Reading Results

The right panel shows:
- **Total Area** in m², hectares, and *tumbak*
- **Perimeter** in meters
- **Estimated Dimensions** (bounding box width × height)
- **Center Coordinates** (latitude / longitude)
- **Location Info** (auto-detected from OpenStreetMap)
- **Accuracy Badge** — HIGH (6+ vertices, >100 m²), MEDIUM, or LOW (<4 vertices, <10 m²)

### Sharing

- **Share** button opens a modal with map preview, QR code, and platform buttons
- **PDF** generates a full measurement report with map image
- **GeoJSON** downloads a standard GIS file for import into QGIS, ArcGIS, etc.

---

## Architecture

```
tanahku/
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Single-file application (~820 lines)
│   └── index.css         # Tailwind directives + base styles
├── public/
│   └── favicon.svg
├── index.html            # Vite HTML entry
├── vite.config.js        # Vite + React plugin, chunk splitting
├── tailwind.config.js
├── postcss.config.js
├── vercel.json           # Vercel deployment config
└── package.json
```

### Design Decisions

**Single-file component** — The entire app lives in `src/App.jsx`. This keeps the codebase simple and avoids premature abstraction for a focused tool.

**Lazy-loaded heavy modules** — jsPDF (594 KB) and html2canvas are loaded via dynamic `import()` only when the user clicks "PDF" or "Share". This cuts initial bundle load by ~200 KB.

**Memoization** — All expensive computations (`measurements`, `shareText`, `tileLayers`) use `useMemo` to avoid re-computation on unrelated state changes.

**AbortController** — All Nominatim API calls use `AbortController` to cancel in-flight requests when parameters change, preventing stale UI updates.

**Click-to-toggle menus** — Layer selector uses click-to-toggle with outside-click dismissal (not CSS hover), ensuring accessibility on all devices.

### Data Flow

```
User clicks map
  → handleMapClick(leaflet latlng)
  → setPoints([...points, latlng])
  → useMemo recalculates measurements (Turf.js geodesic)
  → useEffect triggers reverse geocoding (Nominatim, 1s debounce)
  → locationInfo populates from response
  → shareTitle / shareText update (memoized)
```

---

## Measurement Accuracy

The app uses **Turf.js geodesic calculations** (Vincenty formulae), which account for Earth's curvature — significantly more accurate than flat-plane (Euclidean) math at larger scales.

| Factor | Impact |
|--------|--------|
| **Vertex count** | More vertices → higher polygon fidelity |
| **Zoom level** | Higher zoom → more precise vertex placement |
| **Satellite resolution** | Varieties by location; Esri/Google imagery at zoom 18-20 is ~0.3-0.5 m/pixel |
| **Self-intersection** | Crossing edges make area calculation unreliable — the app warns in red |

### Limitations

- **Not a legal survey** — results are estimates based on satellite imagery
- **Satellite image offset** — imagery may be offset by 1-5 meters depending on location
- **For official purposes** (land certificates, sales, disputes), always use a licensed BPN surveyor

---

## Bilingual Support

The app supports **Bahasa Indonesia (ID)** and **English (EN)** with 80+ translated strings covering:

- UI labels, buttons, and notifications
- PDF report headers, field labels, and disclaimer
- Share modal text and platform buttons
- Accuracy badges and error messages
- Tile layer names

Language preference is persisted in `localStorage` (`tanahku-lang`). The Nominatim geocoding API also passes `accept-language` matching the active language for localized location results.

Toggle the language using the **🌐 ID / EN** button in the top bar.

---

## Security

| Measure | Detail |
|---------|--------|
| **Dependencies audited** | `npm audit` — 0 vulnerabilities |
| **jsPDF upgraded** | 2.5.2 → 4.2.1 (patched 12 CVEs including LFI, PDF injection, XSS CVSS 9.6) |
| **No CDN fallbacks** | All dependencies bundled via npm; no runtime script injection |
| **CSP-safe** | No `eval()`, no inline event handlers, no `innerHTML` from user input |
| **Nominatim User-Agent** | Identifies the app per OSM usage policy |
| **HTTPS required** | Vercel enforces TLS; all external API calls are HTTPS |

---

## Deployment

### Vercel (Recommended)

The project includes `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Deploy:

```bash
npx vercel --prod
```

### Any Static Host

```bash
npm run build
# Upload dist/ to Netlify, Cloudflare Pages, S3+CloudFront, etc.
```

Ensure SPA rewrites are configured (`/index.html` for all routes).

---

## License

MIT — see the [repository](https://github.com/leoui/tanahku) for details.

---

*Built with ❤️ for Indonesian landowners and surveyors everywhere.*
