# 🗺️ LandMeasure - Aplikasi Pengukuran Tanah via Citra Satelit

Aplikasi web gratis untuk mengukur luas tanah secara akurat menggunakan citra satelit. Tandai batas tanah, dapatkan estimasi luas dengan akurasi geodesik, dan share hasil dalam format PDF, gambar, atau QR code.

## ✨ Fitur

- 🛰️ **4 Layer Peta**: Esri Satellite, Google Satellite, Google Hybrid, OpenStreetMap
- 📐 **Akurasi Geodesik**: Menggunakan Turf.js untuk perhitungan yang mempertimbangkan kelengkungan bumi
- 📍 **Auto Reverse Geocoding**: Otomatis mendapat info kota, provinsi, kode pos
- 📊 **Multi-unit**: m², hektar, tumbak (satuan tradisional Indonesia)
- 📱 **Mobile Responsive**: Bisa digunakan di HP
- 📤 **Export PDF & GeoJSON**: Laporan profesional dengan QR code
- 🔗 **Share Multi-platform**: WhatsApp, Telegram, Web Share API

## 🚀 Cara Deploy ke Vercel (3 Cara)

### Cara 1: Deploy via GitHub (Recommended)

1. **Buat repo GitHub baru** dan push project ini:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/landmeasure.git
   git push -u origin main
   ```

2. **Buka [vercel.com](https://vercel.com)** dan login (bisa pakai GitHub)

3. Klik **"Add New Project"** → pilih repo Anda

4. Vercel akan auto-detect Vite config. Klik **"Deploy"**

5. Selesai! Aplikasi live dalam ~1 menit di `your-app.vercel.app`

### Cara 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (jalankan di folder project)
vercel

# Deploy ke production
vercel --prod
```

### Cara 3: Drag & Drop (Tanpa Git)

1. Build project dulu:
   ```bash
   npm install
   npm run build
   ```

2. Buka [vercel.com/new](https://vercel.com/new)

3. Drag folder `dist` ke halaman Vercel

4. Done! 

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run dev server (akan buka http://localhost:3000)
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview
```

## 📦 Tech Stack

| Library | Fungsi |
|---------|--------|
| React 18 | UI framework |
| Vite 6 | Build tool & dev server |
| Leaflet + react-leaflet | Map rendering |
| Turf.js | Kalkulasi geospasial geodesik |
| TailwindCSS | Styling |
| jsPDF + html2canvas | Generate PDF |
| Lucide React | Icons |

## 🌍 APIs yang Digunakan (Semua Gratis)

- **Esri World Imagery**: Tile satelit (tanpa API key)
- **Google Maps Tiles**: Alternative satelit (free tier)
- **OpenStreetMap**: Tile peta jalan
- **Nominatim**: Reverse geocoding & search lokasi
- **QR Server API**: Generate QR code

## ⚙️ Konfigurasi (Opsional)

### Mengganti Default Map Center

Edit `src/App.jsx`, cari baris ini:
```javascript
const [mapCenter, setMapCenter] = useState([-6.2088, 106.8456]); // Jakarta
```

Ganti dengan koordinat default Anda.

### Menambah Custom Tile Layer

Tambahkan di object `tileLayers` di `App.jsx`:
```javascript
'mapbox-satellite': {
  url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=YOUR_TOKEN',
  attribution: '© Mapbox',
  name: 'Mapbox Satellite',
}
```

## ⚠️ Disclaimer

Hasil pengukuran ini adalah **ESTIMASI** berdasarkan citra satelit dan **bukan dokumen legal**. Untuk:
- Sertifikat tanah
- Transaksi jual-beli
- Sengketa hukum
- Pengukuran resmi

Gunakan jasa **BPN (Badan Pertanahan Nasional)** atau **surveyor berlisensi**.

Akurasi tipikal: 1-3% error untuk lahan kecil-sedang dengan citra resolusi tinggi.

## 📄 Struktur Folder

```
landmeasure/
├── public/
├── src/
│   ├── App.jsx          # Main component
│   ├── main.jsx         # Entry point
│   └── index.css        # Tailwind directives
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite config
├── tailwind.config.js   # Tailwind config
├── postcss.config.js    # PostCSS config
├── vercel.json          # Vercel deploy config
└── README.md
```

## 📝 License

MIT - Bebas digunakan untuk kepentingan pribadi atau komersial.

## 🤝 Kontribusi

PR dan feedback sangat welcome!

---

Made with ❤️ for measuring land that's hard to reach
