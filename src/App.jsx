import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { 
  MapPin, Ruler, Download, Share2, Trash2, Undo2, 
  Search, Crosshair, Layers, FileText, QrCode, 
  CheckCircle2, AlertCircle, Info, Plus, Edit3, X, Save
} from 'lucide-react';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom vertex marker
const vertexIcon = L.divIcon({
  className: 'custom-vertex',
  html: '<div style="width:14px;height:14px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Map click handler component
function MapClickHandler({ onMapClick, isDrawing }) {
  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

// Map controller for programmatic navigation
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Generate QR code as data URL using a simple algorithm
function generateQRCodeDataURL(text, size = 200) {
  // Using QR Server API for simplicity - free public API
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

export default function LandMeasurementApp() {
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [savedPolygon, setSavedPolygon] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mapCenter, setMapCenter] = useState([-6.2088, 106.8456]); // Jakarta default
  const [mapZoom, setMapZoom] = useState(13);
  const [locationInfo, setLocationInfo] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImage, setShareImage] = useState(null);
  const [notification, setNotification] = useState(null);
  const [history, setHistory] = useState([]);
  const [tileLayer, setTileLayer] = useState('esri-satellite');
  const [editingVertex, setEditingVertex] = useState(null);
  
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Calculate measurements using Turf.js (geodesic - high accuracy)
  const calculateMeasurements = useCallback((pts) => {
    if (pts.length < 3) return null;
    
    try {
      // Close the polygon
      const coords = pts.map(p => [p.lng, p.lat]);
      coords.push(coords[0]);
      
      const polygon = turf.polygon([coords]);
      
      // Geodesic area calculation (very accurate)
      const areaM2 = turf.area(polygon);
      const areaHa = areaM2 / 10000;
      const areaM2Display = areaM2.toFixed(2);
      
      // Perimeter using geodesic distance
      let perimeter = 0;
      for (let i = 0; i < pts.length; i++) {
        const next = (i + 1) % pts.length;
        const from = turf.point([pts[i].lng, pts[i].lat]);
        const to = turf.point([pts[next].lng, pts[next].lat]);
        perimeter += turf.distance(from, to, { units: 'meters' });
      }
      
      // Bounding box for length & width estimation
      const bbox = turf.bbox(polygon);
      const widthLine = turf.lineString([[bbox[0], bbox[1]], [bbox[2], bbox[1]]]);
      const heightLine = turf.lineString([[bbox[0], bbox[1]], [bbox[0], bbox[3]]]);
      const widthMeters = turf.length(widthLine, { units: 'meters' });
      const heightMeters = turf.length(heightLine, { units: 'meters' });
      
      // Centroid
      const centroid = turf.centroid(polygon);
      const [centerLng, centerLat] = centroid.geometry.coordinates;
      
      // Convert to traditional Indonesian units
      const tumbak = areaM2 / 14; // 1 tumbak ≈ 14 m²
      const bata = areaM2 / 14; // similar
      
      return {
        areaM2: areaM2Display,
        areaHa: areaHa.toFixed(4),
        areaTumbak: tumbak.toFixed(2),
        perimeter: perimeter.toFixed(2),
        width: widthMeters.toFixed(2),
        height: heightMeters.toFixed(2),
        centroid: { lat: centerLat, lng: centerLng },
        vertexCount: pts.length,
      };
    } catch (e) {
      console.error('Measurement error:', e);
      return null;
    }
  }, []);

  const measurements = calculateMeasurements(points);

  // Reverse geocoding via Nominatim (OpenStreetMap)
  const fetchLocationInfo = async (lat, lng) => {
    setIsLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`,
        { headers: { 'User-Agent': 'LandMeasurementApp/1.0' } }
      );
      const data = await response.json();
      
      const addr = data.address || {};
      setLocationInfo({
        displayName: data.display_name || 'Unknown Location',
        village: addr.village || addr.suburb || addr.neighbourhood || '',
        district: addr.city_district || addr.subdistrict || addr.county || '',
        city: addr.city || addr.town || addr.municipality || addr.regency || '',
        province: addr.state || '',
        country: addr.country || 'Indonesia',
        postcode: addr.postcode || '',
        road: addr.road || '',
      });
    } catch (e) {
      console.error('Geocoding error:', e);
      setLocationInfo(null);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Auto-fetch location when polygon updates
  useEffect(() => {
    if (measurements?.centroid) {
      const timer = setTimeout(() => {
        fetchLocationInfo(measurements.centroid.lat, measurements.centroid.lng);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [measurements?.centroid?.lat, measurements?.centroid?.lng]);

  // Search location
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=id&countrycodes=id`,
        { headers: { 'User-Agent': 'LandMeasurementApp/1.0' } }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (e) {
      showNotification('Gagal mencari lokasi', 'error');
    }
  };

  const selectSearchResult = (result) => {
    setMapCenter([parseFloat(result.lat), parseFloat(result.lon)]);
    setMapZoom(18);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(','));
  };

  // Get user location
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Geolocation tidak didukung', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(19);
        showNotification('Lokasi ditemukan');
      },
      () => showNotification('Gagal mendapatkan lokasi', 'error'),
      { enableHighAccuracy: true }
    );
  };

  // Drawing handlers
  const handleMapClick = (latlng) => {
    setHistory([...history, points]);
    setPoints([...points, latlng]);
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setPoints([]);
    setHistory([]);
    showNotification('Klik pada peta untuk menandai batas tanah');
  };

  const finishDrawing = () => {
    if (points.length < 3) {
      showNotification('Minimal 3 titik diperlukan', 'error');
      return;
    }
    setIsDrawing(false);
    setSavedPolygon(points);
    showNotification('Polygon berhasil dibuat!');
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setPoints([]);
    setHistory([]);
  };

  const undoLastPoint = () => {
    if (history.length > 0) {
      setPoints(history[history.length - 1]);
      setHistory(history.slice(0, -1));
    }
  };

  const clearAll = () => {
    setPoints([]);
    setSavedPolygon(null);
    setHistory([]);
    setLocationInfo(null);
    setIsDrawing(false);
  };

  // Update vertex position when dragged
  const updateVertex = (index, latlng) => {
    const newPoints = [...points];
    newPoints[index] = latlng;
    setPoints(newPoints);
  };

  // Generate share content
  const generateShareTitle = () => {
    if (!locationInfo) return 'Tanah Saya';
    const parts = [
      locationInfo.village,
      locationInfo.city,
      locationInfo.province,
      locationInfo.postcode
    ].filter(Boolean);
    return parts.join(', ') || 'Tanah Saya';
  };

  const generateGoogleMapsLink = () => {
    if (!measurements?.centroid) return '';
    return `https://www.google.com/maps?q=${measurements.centroid.lat},${measurements.centroid.lng}`;
  };

  const generateShareText = () => {
    if (!measurements) return '';
    return `📍 ${generateShareTitle()}

📐 Luas: ${measurements.areaM2} m² (${measurements.areaHa} ha)
📏 Keliling: ${measurements.perimeter} m
↔️ Estimasi: ${measurements.width} m × ${measurements.height} m

🗺️ Koordinat: ${measurements.centroid.lat.toFixed(6)}, ${measurements.centroid.lng.toFixed(6)}
🔗 ${generateGoogleMapsLink()}

Diukur dengan Tanahku - https://tanahku.vercel.app`;
  };

  // Capture map as image using html2canvas approach
  const captureMap = async () => {
    if (!window.html2canvas) {
      // Load html2canvas dynamically
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const mapElement = containerRef.current?.querySelector('.leaflet-container');
    if (!mapElement) return null;

    try {
      const canvas = await window.html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1a1a1a',
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Capture error:', e);
      showNotification('Gagal capture peta', 'error');
      return null;
    }
  };

  const openShareModal = async () => {
    if (!measurements) {
      showNotification('Tandai area tanah terlebih dahulu', 'error');
      return;
    }
    setShowShareModal(true);
    showNotification('Mempersiapkan capture...');
    const img = await captureMap();
    setShareImage(img);
  };

  // Share via Web Share API
  const handleNativeShare = async () => {
    const text = generateShareText();
    if (navigator.share) {
      try {
        const shareData = { title: generateShareTitle(), text };
        if (shareImage) {
          const blob = await (await fetch(shareImage)).blob();
          const file = new File([blob], 'tanah.png', { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            shareData.files = [file];
          }
        }
        await navigator.share(shareData);
      } catch (e) {
        if (e.name !== 'AbortError') {
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(text);
          showNotification('Disalin ke clipboard');
        }
      }
    } else {
      navigator.clipboard.writeText(text);
      showNotification('Disalin ke clipboard');
    }
  };

  // Share to specific platforms
  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(generateShareText());
    const url = encodeURIComponent(generateGoogleMapsLink());
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!measurements) {
      showNotification('Tandai area tanah terlebih dahulu', 'error');
      return;
    }

    showNotification('Memproses PDF...');
    
    // Load jsPDF
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const mapImage = await captureMap();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Header
    pdf.setFillColor(16, 185, 129);
    pdf.rect(0, 0, 210, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LAPORAN PENGUKURAN TANAH', 105, 12, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Estimasi via Citra Satelit', 105, 19, { align: 'center' });

    // Reset color
    pdf.setTextColor(30, 30, 30);
    
    // Title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(generateShareTitle(), 105, 35, { align: 'center' });
    
    // Date
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Diukur pada: ${new Date().toLocaleString('id-ID')}`, 105, 41, { align: 'center' });

    // Map image
    if (mapImage) {
      try {
        pdf.addImage(mapImage, 'PNG', 15, 47, 180, 90);
      } catch (e) {
        console.error('PDF image error:', e);
      }
    }

    // Measurement section
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HASIL PENGUKURAN', 15, 148);
    
    pdf.setDrawColor(16, 185, 129);
    pdf.setLineWidth(0.5);
    pdf.line(15, 150, 195, 150);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    let y = 158;
    const lineHeight = 6;

    const drawRow = (label, value) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(label, 20, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(20, 20, 20);
      pdf.text(value, 100, y);
      y += lineHeight;
    };

    drawRow('Luas Area:', `${measurements.areaM2} m² (${measurements.areaHa} ha)`);
    drawRow('Keliling:', `${measurements.perimeter} m`);
    drawRow('Estimasi Panjang × Lebar:', `${measurements.width} m × ${measurements.height} m`);
    drawRow('Jumlah Titik Sudut:', `${measurements.vertexCount} titik`);
    drawRow('Koordinat Pusat:', `${measurements.centroid.lat.toFixed(6)}, ${measurements.centroid.lng.toFixed(6)}`);

    // Location info
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('INFORMASI LOKASI', 15, y);
    pdf.line(15, y + 2, 195, y + 2);
    y += 10;
    
    pdf.setFontSize(10);
    if (locationInfo) {
      if (locationInfo.road) drawRow('Jalan:', locationInfo.road);
      if (locationInfo.village) drawRow('Desa/Kelurahan:', locationInfo.village);
      if (locationInfo.district) drawRow('Kecamatan:', locationInfo.district);
      if (locationInfo.city) drawRow('Kota/Kabupaten:', locationInfo.city);
      if (locationInfo.province) drawRow('Provinsi:', locationInfo.province);
      if (locationInfo.postcode) drawRow('Kode Pos:', locationInfo.postcode);
    }

    // QR Code
    try {
      const qrUrl = generateQRCodeDataURL(generateShareText(), 150);
      const qrResponse = await fetch(qrUrl);
      const qrBlob = await qrResponse.blob();
      const qrDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(qrBlob);
      });
      
      pdf.addImage(qrDataUrl, 'PNG', 155, 235, 40, 40);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Scan untuk detail', 175, 280, { align: 'center' });
    } catch (e) {
      console.error('QR error:', e);
    }

    // Footer disclaimer
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont('helvetica', 'italic');
    const disclaimer = 'DISCLAIMER: Hasil pengukuran ini adalah ESTIMASI berdasarkan citra satelit dan bukan dokumen legal. Untuk keperluan resmi (sertifikat, jual-beli, sengketa), gunakan jasa BPN atau surveyor berlisensi.';
    const splitDisclaimer = pdf.splitTextToSize(disclaimer, 130);
    pdf.text(splitDisclaimer, 15, 240);

    pdf.setFontSize(7);
    pdf.text(`Halaman 1 dari 1 • ${generateGoogleMapsLink()}`, 105, 290, { align: 'center' });

    pdf.save(`tanah-${Date.now()}.pdf`);
    showNotification('PDF berhasil diunduh!');
  };

  // Export GeoJSON
  const exportGeoJSON = () => {
    if (!points.length) return;
    const coords = points.map(p => [p.lng, p.lat]);
    coords.push(coords[0]);
    const geojson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          name: generateShareTitle(),
          area_m2: measurements?.areaM2,
          perimeter_m: measurements?.perimeter,
          measured_at: new Date().toISOString(),
        },
        geometry: { type: 'Polygon', coordinates: [coords] },
      }],
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tanah-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('GeoJSON berhasil diunduh');
  };

  const tileLayers = {
    'esri-satellite': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      name: 'Satelit (Esri)',
    },
    'google-satellite': {
      url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      name: 'Satelit (Google)',
    },
    'osm': {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png',
      attribution: '&copy; OpenStreetMap',
      name: 'Peta Jalan',
    },
    'hybrid': {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      name: 'Hybrid',
    },
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden" style={{
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
      background: '#0a0a0a'
    }}>
      <style>{`
        .leaflet-container { background: #1a1a1a; font-family: inherit; }
        .leaflet-control-attribution { font-size: 9px; background: rgba(0,0,0,0.5) !important; color: #888 !important; }
        .leaflet-control-attribution a { color: #aaa !important; }
        .custom-vertex { cursor: grab; }
        .vertex-number {
          background: #10b981; color: white; border-radius: 50%;
          width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .slide-in { animation: slideIn 0.3s ease-out; }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-ring { animation: pulse-ring 2s infinite; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.5); border-radius: 4px; }
      `}</style>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="absolute inset-0 z-0"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url={tileLayers[tileLayer].url}
          attribution={tileLayers[tileLayer].attribution}
          maxZoom={20}
        />
        
        <MapController center={mapCenter} zoom={mapZoom} />
        <MapClickHandler onMapClick={handleMapClick} isDrawing={isDrawing} />
        
        {/* Polygon */}
        {points.length >= 3 && (
          <Polygon
            positions={points}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.25,
              weight: 3,
              dashArray: isDrawing ? '8,8' : null,
            }}
          />
        )}
        
        {/* Line preview during drawing (less than 3 points) */}
        {isDrawing && points.length === 2 && (
          <Polygon
            positions={points}
            pathOptions={{
              color: '#10b981',
              fill: false,
              weight: 3,
              dashArray: '8,8',
            }}
          />
        )}

        {/* Vertex markers */}
        {points.map((point, idx) => (
          <Marker
            key={`vertex-${idx}`}
            position={point}
            icon={L.divIcon({
              className: 'vertex-marker',
              html: `<div class="vertex-number">${idx + 1}</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
            draggable={!isDrawing}
            eventHandlers={{
              dragend: (e) => updateVertex(idx, e.target.getLatLng()),
            }}
          />
        ))}
      </MapContainer>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-start gap-3 pointer-events-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-xl border" style={{
            background: 'rgba(10, 10, 10, 0.85)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}>
              <Ruler className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-bold text-sm leading-tight">Tanahku</div>
              <div className="text-emerald-400 text-[10px] font-mono">SATELLITE PRECISION</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <form onSubmit={handleSearch}>
              <div className="relative flex items-center rounded-2xl backdrop-blur-xl border overflow-hidden" style={{
                background: 'rgba(10, 10, 10, 0.85)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}>
                <Search className="w-4 h-4 text-gray-400 ml-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari lokasi (kota, alamat, koordinat)..."
                  className="flex-1 bg-transparent text-white text-sm py-3 px-3 outline-none placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="px-3 py-3 hover:bg-white/5 transition border-l border-white/10"
                  title="Lokasi saya"
                >
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                </button>
                <button
                  type="submit"
                  className="px-4 py-3 hover:bg-emerald-500/20 transition border-l border-white/10"
                >
                  <Search className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full rounded-2xl backdrop-blur-xl border overflow-hidden slide-in" style={{
                background: 'rgba(10, 10, 10, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}>
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSearchResult(result)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition border-b border-white/5 last:border-0 flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white text-xs leading-relaxed">{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layer Switcher */}
          <div className="relative group">
            <button className="p-3 rounded-2xl backdrop-blur-xl border hover:bg-white/5 transition" style={{
              background: 'rgba(10, 10, 10, 0.85)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}>
              <Layers className="w-5 h-5 text-white" />
            </button>
            <div className="absolute right-0 top-full mt-2 rounded-2xl backdrop-blur-xl border overflow-hidden hidden group-hover:block" style={{
              background: 'rgba(10, 10, 10, 0.95)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              minWidth: '180px'
            }}>
              {Object.entries(tileLayers).map(([key, layer]) => (
                <button
                  key={key}
                  onClick={() => setTileLayer(key)}
                  className={`w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition text-xs ${
                    tileLayer === key ? 'text-emerald-400 bg-emerald-500/10' : 'text-white'
                  }`}
                >
                  {layer.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons - Drawing Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-xl border slide-in" style={{
          background: 'rgba(10, 10, 10, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          {!isDrawing ? (
            <>
              <button
                onClick={startDrawing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white pulse-ring transition hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <Plus className="w-4 h-4" />
                Tandai Tanah
              </button>
              {points.length > 0 && (
                <>
                  <div className="w-px h-8 bg-white/10" />
                  <button
                    onClick={() => setIsDrawing(true)}
                    className="p-2.5 rounded-xl hover:bg-white/5 transition text-white"
                    title="Lanjut menggambar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition text-white"
                    title="Hapus semua"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="px-3 py-1 text-xs">
                <div className="text-emerald-400 font-mono font-bold">{points.length} TITIK</div>
                <div className="text-gray-500 text-[10px]">Klik peta untuk menambah</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <button
                onClick={undoLastPoint}
                disabled={history.length === 0}
                className="p-2.5 rounded-xl hover:bg-white/5 transition text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={cancelDrawing}
                className="p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition text-white"
                title="Batal"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={finishDrawing}
                disabled={points.length < 3}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Selesai
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Measurements */}
      {measurements && showInfoPanel && (
        <div className="absolute top-24 right-4 z-[1000] w-80 max-h-[calc(100vh-180px)] rounded-2xl backdrop-blur-xl border overflow-hidden flex flex-col slide-in" style={{
          background: 'rgba(10, 10, 10, 0.92)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
        }}>
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between" style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, transparent 100%)',
          }}>
            <div>
              <div className="text-emerald-400 text-[10px] font-mono font-bold tracking-wider">PENGUKURAN</div>
              <div className="text-white font-bold text-sm">Detail Tanah</div>
            </div>
            <button
              onClick={() => setShowInfoPanel(false)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* Main Area */}
            <div className="p-4 border-b border-white/5">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Luas Total</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-white" style={{ fontFamily: '"Space Mono", monospace' }}>
                  {measurements.areaM2}
                </div>
                <div className="text-emerald-400 font-bold text-sm">m²</div>
              </div>
              <div className="text-xs text-gray-400 mt-1 font-mono">
                = {measurements.areaHa} hektar • {measurements.areaTumbak} tumbak
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-px bg-white/5">
              <div className="p-4 bg-black/40">
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">Keliling</div>
                <div className="text-white font-bold text-lg" style={{ fontFamily: '"Space Mono", monospace' }}>
                  {measurements.perimeter}
                </div>
                <div className="text-emerald-400 text-[10px] font-mono">METER</div>
              </div>
              <div className="p-4 bg-black/40">
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">Titik</div>
                <div className="text-white font-bold text-lg" style={{ fontFamily: '"Space Mono", monospace' }}>
                  {measurements.vertexCount}
                </div>
                <div className="text-emerald-400 text-[10px] font-mono">VERTICES</div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="p-4 border-b border-white/5">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Estimasi Dimensi</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 rounded-lg bg-black/40 border border-white/5">
                  <div className="text-emerald-400 text-[10px] font-mono">PANJANG</div>
                  <div className="text-white font-bold" style={{ fontFamily: '"Space Mono", monospace' }}>
                    {measurements.width} m
                  </div>
                </div>
                <div className="text-gray-500 text-xl">×</div>
                <div className="flex-1 p-3 rounded-lg bg-black/40 border border-white/5">
                  <div className="text-emerald-400 text-[10px] font-mono">LEBAR</div>
                  <div className="text-white font-bold" style={{ fontFamily: '"Space Mono", monospace' }}>
                    {measurements.height} m
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 mt-2 italic">*Bounding box dimensions</div>
            </div>

            {/* Coordinates */}
            <div className="p-4 border-b border-white/5">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Koordinat Pusat</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40">
                  <span className="text-gray-400 text-xs font-mono">LAT</span>
                  <span className="text-white text-xs font-bold" style={{ fontFamily: '"Space Mono", monospace' }}>
                    {measurements.centroid.lat.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40">
                  <span className="text-gray-400 text-xs font-mono">LNG</span>
                  <span className="text-white text-xs font-bold" style={{ fontFamily: '"Space Mono", monospace' }}>
                    {measurements.centroid.lng.toFixed(6)}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Info */}
            {(isLoadingLocation || locationInfo) && (
              <div className="p-4 border-b border-white/5">
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Lokasi</div>
                {isLoadingLocation ? (
                  <div className="text-gray-400 text-xs animate-pulse">Mendeteksi lokasi...</div>
                ) : locationInfo && (
                  <div className="space-y-1 text-xs">
                    {locationInfo.road && <div className="text-white">{locationInfo.road}</div>}
                    {locationInfo.village && <div className="text-gray-300">{locationInfo.village}</div>}
                    {locationInfo.district && <div className="text-gray-400">{locationInfo.district}</div>}
                    {locationInfo.city && <div className="text-emerald-400 font-semibold">{locationInfo.city}</div>}
                    {locationInfo.province && <div className="text-gray-300">{locationInfo.province}</div>}
                    {locationInfo.postcode && (
                      <div className="text-gray-500 font-mono pt-1">📮 {locationInfo.postcode}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Accuracy Notice */}
            <div className="p-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-200/80 leading-relaxed">
                  Hasil ini estimasi geodesik. Untuk dokumen legal, gunakan jasa BPN/surveyor.
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t border-white/10 grid grid-cols-3 gap-2" style={{
            background: 'rgba(0, 0, 0, 0.4)',
          }}>
            <button
              onClick={openShareModal}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 transition group"
            >
              <Share2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              <span className="text-[10px] text-white font-medium">Share</span>
            </button>
            <button
              onClick={exportToPDF}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 transition group"
            >
              <FileText className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              <span className="text-[10px] text-white font-medium">PDF</span>
            </button>
            <button
              onClick={exportGeoJSON}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 transition group"
            >
              <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              <span className="text-[10px] text-white font-medium">GeoJSON</span>
            </button>
          </div>
        </div>
      )}

      {/* Show panel button when hidden */}
      {measurements && !showInfoPanel && (
        <button
          onClick={() => setShowInfoPanel(true)}
          className="absolute top-24 right-4 z-[1000] p-3 rounded-2xl backdrop-blur-xl border slide-in"
          style={{
            background: 'rgba(10, 10, 10, 0.85)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          }}
        >
          <Info className="w-5 h-5 text-emerald-400" />
        </button>
      )}

      {/* Onboarding Hint - shown when no points */}
      {points.length === 0 && !isDrawing && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] pointer-events-none">
          <div className="text-center">
            <div className="inline-block px-6 py-4 rounded-2xl backdrop-blur-xl border" style={{
              background: 'rgba(10, 10, 10, 0.7)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}>
              <div className="text-emerald-400 text-[10px] font-mono font-bold tracking-wider mb-2">MULAI</div>
              <div className="text-white font-semibold text-sm mb-1">Cari lokasi tanah Anda</div>
              <div className="text-gray-400 text-xs">Lalu klik "Tandai Tanah" di bawah</div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[2000] slide-in">
          <div className={`px-4 py-2 rounded-xl backdrop-blur-xl border flex items-center gap-2 text-sm ${
            notification.type === 'error' 
              ? 'border-red-500/50 text-red-300' 
              : 'border-emerald-500/50 text-emerald-300'
          }`} style={{
            background: 'rgba(10, 10, 10, 0.92)',
          }}>
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {notification.message}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" style={{
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
        }}>
          <div className="w-full max-w-md rounded-3xl border overflow-hidden slide-in" style={{
            background: 'rgba(10, 10, 10, 0.95)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
          }}>
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-emerald-400 text-[10px] font-mono font-bold tracking-wider">SHARE</div>
                <div className="text-white font-bold">Bagikan Informasi Tanah</div>
              </div>
              <button
                onClick={() => { setShowShareModal(false); setShareImage(null); }}
                className="p-1.5 rounded-lg hover:bg-white/5 transition text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto scrollbar-thin">
              {/* Preview Card */}
              <div className="rounded-2xl overflow-hidden border border-white/10 mb-5">
                {shareImage ? (
                  <img src={shareImage} alt="Map preview" className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-black/40 flex items-center justify-center">
                    <div className="text-gray-500 text-xs animate-pulse">Memproses peta...</div>
                  </div>
                )}
                <div className="p-4 bg-black/60">
                  <div className="text-white font-bold text-sm mb-1">{generateShareTitle()}</div>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                    <div>
                      <div className="text-gray-500 text-[10px] uppercase font-mono">Luas</div>
                      <div className="text-emerald-400 font-bold" style={{ fontFamily: '"Space Mono", monospace' }}>
                        {measurements?.areaM2} m²
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-[10px] uppercase font-mono">Keliling</div>
                      <div className="text-emerald-400 font-bold" style={{ fontFamily: '"Space Mono", monospace' }}>
                        {measurements?.perimeter} m
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="rounded-2xl p-5 bg-white mb-5 flex flex-col items-center">
                <img 
                  src={generateQRCodeDataURL(generateShareText())} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
                <div className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Scan untuk detail tanah</div>
              </div>

              {/* Share Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <Share2 className="w-4 h-4" />
                  Bagikan via Sistem
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={shareToWhatsApp}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition hover:bg-emerald-600"
                    style={{ background: '#25D366' }}
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={shareToTelegram}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition hover:opacity-90"
                    style={{ background: '#0088cc' }}
                  >
                    Telegram
                  </button>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateShareText());
                    showNotification('Disalin ke clipboard');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white border border-white/10 hover:bg-white/5 transition"
                >
                  Salin Teks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
