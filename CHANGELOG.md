# Changelog

All notable changes to Tanahku are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-06-06

### 🚀 Deployment

- **Domain** — deployed to `https://tanahku.de` (VPS 43.129.36.136, Debian 12, Nginx)
- **SSL** — Let's Encrypt certificate with auto-renewal
- **www redirect** — `www.tanahku.de` → `https://tanahku.de` forced redirect

### 🗺️ PDF Capture Fix

- **Tile proxy** — Nginx `/tiles/esri/` location proxies Esri satellite tiles through same origin, adding `Access-Control-Allow-Origin: *` headers; eliminates CORS tainting for PDF capture
- **Capture config** — `useCORS: true` + `foreignObjectRendering: true` + `allowTaint: false`; tiles render from same-origin proxy, polygon SVG lines/fill render via foreignObject, vertex markers render as divIcon HTML
- **Tile wait** — `Promise.allSettled` on all tile img elements before capture + 800ms settle delay

### 🎨 Favicon

- **New favicon** — 512px SVG with emerald gradient, survey polyline icon, proper `viewBox`
- **HTML** — `apple-touch-icon` + `icon` links added

### 🔍 Domain & SEO

- **All references updated** — `tanahku.vercel.app` → `tanahku.de` in index.html, App.jsx, JSON-LD, Open Graph, Twitter Cards, hreflang, share text
- **OG image** — updated to `https://tanahku.de/og-image.svg`

### 🐛 Bug Fixes

- **Road Map tiles** — fixed `/{z}/{y}/{x}` → `/{z}/{x}/{y}` in OSM tile URL (was swapped, caused 404 white tiles)
- **Favicon 403** — fixed file permissions on deployed server

---

## [1.1.0] — 2026-06-03

### 🔒 Security

- **jsPDF upgraded 2.5.2 → 4.2.1** — patched 12 CVEs including LFI/path traversal (GHSA-f8cm-6447-x5h2), HTML injection XSS CVSS 9.6 (GHSA-wfv2-pwc8-crg5), PDF injection arbitrary JS execution (GHSA-pqxr-3g65-p328, GHSA-9vjf-qc39-jprp, GHSA-p5xg-68wr-hm3m, GHSA-7x6v-j9x4-qf24), DoS via BMP/GIF (GHSA-95fx-jjr5-f39c, GHSA-67pg-wm7f-q7fj), ReDoS (GHSA-w532-jxjh-hjhj), XMP metadata injection (GHSA-vm32-vv63-w422), race condition (GHSA-cjw8-79x6-5cj4)
- **dompurify** — 7 XSS/mutation-XSS CVEs resolved via jsPDF upgrade (GHSA-vhxf-7vqr-mrjg, GHSA-cjmm-f4jc-qw8r, GHSA-cj63-jhhr-wcxv, GHSA-39q2-94rc-95cp, GHSA-h7mw-gpvr-xq4m, GHSA-crv5-9vww-q3g8, GHSA-h8r8-wccr-v5f2)
- **CDN fallbacks removed** — `html2canvas` and `jsPDF` now loaded exclusively from npm (no runtime `document.createElement('script')` injection)
- `npm audit` — 0 vulnerabilities (down from 2: 1 critical + 1 moderate)

### ⚡ Performance

- **Lazy loading** — `jsPDF` (594 KB) and `html2canvas` loaded via dynamic `import()` only on first PDF/Share action; saves ~200 KB from initial bundle
- **Memoized measurements** — `useMemo` replaces render-time `calculateMeasurements` call; avoids redundant Turf.js geodesic recomputation on unrelated state changes
- **Debounced search** — 350ms debounce on Nominatim geocoding input; prevents keystroke-by-keystroke API spam
- **Stable vertex keys** — `lat.toFixed(6)` in marker keys prevents unnecessary Leaflet re-renders
- **MapController skip** — `flyTo` only fires when center/zoom actually change (string-compared prev values)
- **32 dependency updates** — all packages bumped to latest minor versions

### 🛡️ Stability

- **React Error Boundary** — wraps entire app; catches render crashes with bilingual error message + reload button
- **AbortController** — all Nominatim API calls use abort controllers; prevents stale state updates after rapid re-fetch or unmount
- **Geolocation timeout** — 10s timeout, 30s maximum age; proper cleanup via `clearWatch`
- **Notification timer cleanup** — `clearTimeout` on re-trigger prevents overlapping toasts
- **Search loading spinner** — visual feedback during Nominatim fetch
- **Tile readiness wait** — 400ms delay before `html2canvas` capture ensures satellite tiles are painted

### 🎯 Accuracy

- **Self-intersection detection** — `turf.kinks` validates polygon integrity; red border + panel warning when edges cross
- **Regional tumbak units** — `useMemo` picks correct divisor per province (Jawa Barat=14 m², Bali=10 m², Lombok=12 m², default=14 m²)
- **Confidence badge** — 3-tier indicator based on vertex count + area size:
  - **HIGH** (green): 6+ vertices, >100 m²
  - **MEDIUM** (amber): default
  - **LOW** (red): <4 vertices or <10 m²
- **Share text date** — localized formatting (`id-ID` / `en-US`)

### 🌍 Worldwide Search

- **Removed `countrycodes=id`** — Nominatim search no longer restricted to Indonesia
- **`accept-language` parameter** — matches active UI language for localized geocoding results
- Reverse geocoding now covers all countries

### 🌐 Bilingual EN/ID

- **80+ translated strings** — all UI labels, buttons, notifications, PDF headers, share text, error messages
- **Language toggle** — `🌐 ID` / `🌐 EN` button in top bar; persisted to `localStorage` (`tanahku-lang`)
- **Tile layer names** — translated (`Satelit (Esri)` ↔ `Satellite (Esri)`, `Peta Jalan` ↔ `Road Map`, etc.)
- **PDF bilingual** — report title, field labels, disclaimer, date format all follow active language
- **Nominatim language** — `accept-language` matches UI language for localized place names

### 🐛 Bug Fixes

- **Layer menu hover → click** — replaced CSS `group-hover` with click-to-toggle + outside-click dismissal; fixes menu disappearing before cursor reaches it
- **Road Map tile URL** — fixed `/{z}/{y}/{x}` → `/{z}/{x}/{y}` in OSM tile URL; swapped coordinates caused 404 white tiles
- **Blank page crash** — JSX rendering issue resolved by migrating to `React.createElement()` throughout the render tree

### 📝 Documentation

- **README.md** — comprehensive 9 KB documentation: features table, tech stack, setup instructions, usage walkthrough, architecture diagram with data flow, measurement accuracy section, bilingual system details, security audit summary, deployment guides (Vercel + static hosts)

### 🔍 SEO & AI Indexing

- **`public/robots.txt`** — allows all crawlers including GPTBot, ChatGPT-User, CCBot, anthropic-ai, Claude-Web, Google-Extended, PerplexityBot, YouBot
- **`public/sitemap.xml`** — URL entry with `hreflang` alternates (id / en / x-default)
- **`public/llms.txt`** — AI-readable markdown site summary (2.5 KB)
- **`public/llms-full.txt`** — full README content for deep AI crawling (9 KB)
- **`public/og-image.svg`** — 1200×630 dark-themed social preview with feature pills
- **`public/favicon.svg`** — emerald-green app icon
- **`index.html`** enhanced with:
  - JSON-LD `WebApplication` structured data (full feature list, languages, pricing, OS)
  - `hreflang` link alternates for multilingual SEO
  - `ai-content: allowed` + `llm-index: allow` meta tags
  - Extended Open Graph + Twitter Card tags with locale alternates
  - `<noscript>` fallback with app description
  - DNS prefetch for all external APIs

---

## [1.0.0] — 2026-05-10

### Initial Release

- Satellite map with 4 tile layers (Esri, Google, OSM, Hybrid)
- Polygon boundary drawing with draggable vertices
- Geodesic area and perimeter calculation via Turf.js
- PDF report export via jsPDF
- GeoJSON export
- Reverse geocoding via OpenStreetMap Nominatim
- GPS geolocation
- Indonesia-focused location search
- Share via native Web Share API, WhatsApp, Telegram
- Bounding box dimensions estimation
- Dark glassmorphism UI with Tailwind CSS
- Responsive design (mobile, tablet, desktop)
