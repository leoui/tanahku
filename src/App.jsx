import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { 
  MapPin, Ruler, Download, Share2, Trash2, Undo2, 
  Search, Crosshair, Layers, FileText, Globe,
  CheckCircle2, AlertCircle, Info, Plus, Edit3, X, AlertTriangle, Shield
} from 'lucide-react';

// ─── i18n ───
const LANG = {
  id: {
    tagline:'SATELLITE PRECISION', searchPlaceholder:'Cari lokasi (kota, alamat, koordinat)...',
    searchTitle:'Lokasi saya', markBtn:'Tandai Tanah', continueDraw:'Lanjut menggambar',
    deleteAll:'Hapus semua', pointsLabel:'{n} TITIK', clickToAdd:'Klik peta untuk menambah',
    undo:'Undo', cancel:'Batal', done:'Selesai',
    measurement:'PENGUKURAN', landDetails:'Detail Tanah', totalArea:'Luas Total',
    hectares:'hektar', tumbak:'tumbak', perimeter:'Keliling', meters:'METER',
    points:'Titik', vertices:'VERTICES', estDimensions:'Estimasi Dimensi',
    length:'PANJANG', width:'LEBAR', bboxNote:'*Dimensi bounding box (estimasi)',
    centerCoords:'Koordinat Pusat', location:'Lokasi', detecting:'Mendeteksi lokasi...',
    start:'MULAI', findLand:'Cari lokasi tanah Anda', clickMark:'Lalu klik "Tandai Tanah" di bawah',
    share:'SHARE', shareInfo:'Bagikan Informasi Tanah', processingMap:'Memproses peta...',
    area:'Luas', scanDetail:'Scan untuk detail tanah', shareSystem:'Bagikan via Sistem',
    copyText:'Salin Teks',
    pdfTitle:'LAPORAN PENGUKURAN TANAH', pdfSubtitle:'Estimasi via Citra Satelit',
    pdfMeasuredOn:'Diukur pada:', pdfResults:'HASIL PENGUKURAN', pdfArea:'Luas Area:',
    pdfPerimeter:'Keliling:', pdfDimensions:'P × L (estimasi):', pdfPointCount:'Jumlah Titik:',
    pdfPoints:'titik', pdfCenter:'Koordinat Pusat:', pdfLocation:'INFORMASI LOKASI',
    pdfRoad:'Jalan:', pdfVillage:'Desa/Kelurahan:', pdfDistrict:'Kecamatan:',
    pdfCity:'Kota/Kabupaten:', pdfProvince:'Provinsi:', pdfPostcode:'Kode Pos:',
    pdfDisclaimer:'DISCLAIMER: Hasil pengukuran ini adalah ESTIMASI berdasarkan citra satelit dan bukan dokumen legal.',
    pdfPage:'Halaman 1 dari 1', pdfScan:'Scan untuk detail',
    notifGeoUnsupported:'Geolocation tidak didukung', notifGeoFound:'Lokasi ditemukan',
    notifGeoFail:'Gagal mendapatkan lokasi', notifClickMap:'Klik pada peta untuk menandai batas tanah',
    notifMin3:'Minimal 3 titik diperlukan', notifPolygonDone:'Polygon berhasil dibuat!',
    notifMarkFirst:'Tandai area tanah terlebih dahulu', notifProcessingPDF:'Memproses PDF...',
    notifPDFDone:'PDF berhasil diunduh!', notifPDFFail:'Gagal membuat PDF',
    notifCaptureFail:'Gagal capture peta', notifGeoJSONDone:'GeoJSON berhasil diunduh',
    notifCopied:'Disalin ke clipboard', notifPreparing:'Mempersiapkan capture...',
    notifSearchFail:'Gagal mencari lokasi',
    warnSelfIntersect:'Polygon saling memotong! Area mungkin tidak akurat. Edit titik-titik sudut untuk memperbaikinya.',
    accuracyHigh:'AKURASI TINGGI', accuracyMed:'AKURASI SEDANG', accuracyLow:'AKURASI RENDAH',
    disclaimer:'Hasil ini estimasi geodesik. Untuk dokumen legal, gunakan jasa BPN/surveyor.',
    copyrightPrefix:'Dibuat dengan semangat oleh ',
    copyrightSuffix:' pada 2026',
    errTitle:'Aplikasi mengalami error', errReload:'Muat Ulang',
    tileSatEsri:'Satelit (Esri)', tileSatGoogle:'Satelit (Google)',
    tileRoad:'Peta Jalan', tileHybrid:'Hybrid',
    myLand:'Tanah Saya', shareFooter:'Diukur dengan Tanahku',
  },
  en: {
    tagline:'SATELLITE PRECISION', searchPlaceholder:'Search location (city, address, coordinates)...',
    searchTitle:'My location', markBtn:'Mark Land', continueDraw:'Continue drawing',
    deleteAll:'Delete all', pointsLabel:'{n} POINTS', clickToAdd:'Click map to add',
    undo:'Undo', cancel:'Cancel', done:'Done',
    measurement:'MEASUREMENT', landDetails:'Land Details', totalArea:'Total Area',
    hectares:'hectares', tumbak:'tumbak', perimeter:'Perimeter', meters:'METERS',
    points:'Points', vertices:'VERTICES', estDimensions:'Est. Dimensions',
    length:'LENGTH', width:'WIDTH', bboxNote:'*Bounding box dimensions (estimate)',
    centerCoords:'Center Coordinates', location:'Location', detecting:'Detecting location...',
    start:'START', findLand:'Find your land location', clickMark:'Then click "Mark Land" below',
    share:'SHARE', shareInfo:'Share Land Info', processingMap:'Processing map...',
    area:'Area', scanDetail:'Scan for land details', shareSystem:'Share via System',
    copyText:'Copy Text',
    pdfTitle:'LAND MEASUREMENT REPORT', pdfSubtitle:'Satellite Image Estimation',
    pdfMeasuredOn:'Measured on:', pdfResults:'MEASUREMENT RESULTS', pdfArea:'Land Area:',
    pdfPerimeter:'Perimeter:', pdfDimensions:'W × H (estimated):', pdfPointCount:'Point Count:',
    pdfPoints:'points', pdfCenter:'Center Coord:', pdfLocation:'LOCATION INFO',
    pdfRoad:'Road:', pdfVillage:'Village:', pdfDistrict:'District:',
    pdfCity:'City/Regency:', pdfProvince:'Province:', pdfPostcode:'Postal Code:',
    pdfDisclaimer:'DISCLAIMER: This measurement is an ESTIMATE based on satellite imagery and is not a legal document.',
    pdfPage:'Page 1 of 1', pdfScan:'Scan for details',
    notifGeoUnsupported:'Geolocation not supported', notifGeoFound:'Location found',
    notifGeoFail:'Failed to get location', notifClickMap:'Click on the map to mark land boundaries',
    notifMin3:'At least 3 points required', notifPolygonDone:'Polygon created!',
    notifMarkFirst:'Mark the land area first', notifProcessingPDF:'Processing PDF...',
    notifPDFDone:'PDF downloaded!', notifPDFFail:'Failed to create PDF',
    notifCaptureFail:'Map capture failed', notifGeoJSONDone:'GeoJSON downloaded',
    notifCopied:'Copied to clipboard', notifPreparing:'Preparing capture...',
    notifSearchFail:'Location search failed',
    warnSelfIntersect:'Polygon is self-intersecting! Area may be inaccurate. Drag vertices to fix.',
    accuracyHigh:'HIGH ACCURACY', accuracyMed:'MEDIUM ACCURACY', accuracyLow:'LOW ACCURACY',
    disclaimer:'This is a geodesic estimate. For legal documents, use a licensed surveyor.',
    copyrightPrefix:'Made with passion by ',
    copyrightSuffix:' in 2026',
    errTitle:'Application error', errReload:'Reload',
    tileSatEsri:'Satellite (Esri)', tileSatGoogle:'Satellite (Google)',
    tileRoad:'Road Map', tileHybrid:'Hybrid',
    myLand:'My Land', shareFooter:'Measured with Tanahku',
  },
};

function loadLang() { try { return localStorage.getItem('tanahku-lang')||'id'; } catch { return 'id'; } }

// ─── Error Boundary ───
class ErrorBoundary extends React.Component {
  constructor(p){super(p);this.state={error:null}}
  static getDerivedStateFromError(e){return{error:e}}
  render(){
    if(this.state.error){
      const t=this.props.t||((k)=>LANG.id[k]||k);
      return React.createElement('div',{className:'w-full h-screen flex items-center justify-center',style:{background:'#0a0a0a'}},
        React.createElement('div',{className:'text-center p-8 rounded-2xl border max-w-md',style:{borderColor:'rgba(239,68,68,0.3)',background:'rgba(10,10,10,0.95)'}},
          React.createElement(AlertTriangle,{className:'w-10 h-10 text-red-400 mx-auto mb-4'}),
          React.createElement('div',{className:'text-white font-bold mb-2'},t('errTitle')),
          React.createElement('div',{className:'text-gray-400 text-sm mb-4'},this.state.error.message),
          React.createElement('button',{onClick:()=>{this.setState({error:null});window.location.reload()},className:'px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition'},t('errReload'))
        )
      );
    }
    return this.props.children;
  }
}

// ─── Leaflet setup ───
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TUMBAK_PER_M2={default:14,'jawa barat':14,'jawa tengah':14,bali:10,lombok:12};
const NOMINATIM_UA='LandMeasurementApp/1.1';
const NOMINATIM_BASE='https://nominatim.openstreetmap.org';

// ─── Sub-components ───
const MapClickHandler=React.memo(({onMapClick,isDrawing})=>{useMapEvents({click:(e)=>{if(isDrawing)onMapClick(e.latlng)}});return null});
const MapController=React.memo(({center,zoom})=>{const map=useMap();const pr=useRef('');useEffect(()=>{const k=`${center?.[0]?.toFixed(5)},${center?.[1]?.toFixed(5)},${zoom}`;if(center&&k!==pr.current){pr.current=k;map.flyTo(center,zoom||map.getZoom(),{duration:1.2})}},[center,zoom,map]);return null});
function genQR(text,size=200){return`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`}
function useDebounce(value,delay=300){const[d,s]=useState(value);useEffect(()=>{const t=setTimeout(()=>s(value),delay);return()=>clearTimeout(t)},[value,delay]);return d}

// ─── Main App ───
export default function LandMeasurementApp(){
  const[lang,setLang]=useState(loadLang);
  const tl=useCallback((k,v)=>{const s=LANG[lang]?.[k]||LANG.id[k]||k;return v?s.replace(/\{(\w+)\}/g,(_,x)=>v[x]??`{${x}}`):s},[lang]);
  useEffect(()=>{try{localStorage.setItem('tanahku-lang',lang)}catch{}},[lang]);
  const toggleLang=useCallback(()=>setLang(l=>l==='id'?'en':'id'),[]);

  const[points,setPoints]=useState([]);
  const[isDrawing,setIsDrawing]=useState(false);
  const[searchQuery,setSearchQuery]=useState('');
  const[searchResults,setSearchResults]=useState([]);
  const[mapCenter,setMapCenter]=useState([-6.2088,106.8456]);
  const[mapZoom,setMapZoom]=useState(13);
  const[locationInfo,setLocationInfo]=useState(null);
  const[isLoadingLocation,setIsLoadingLocation]=useState(false);
  const[showInfoPanel,setShowInfoPanel]=useState(true);
  const[showShareModal,setShowShareModal]=useState(false);
  const[shareImage,setShareImage]=useState(null);
  const[notification,setNotification]=useState(null);
  const[history,setHistory]=useState([]);
  const[tileLayer,setTileLayer]=useState('esri-satellite');
  const[isSearching,setIsSearching]=useState(false);
  const[showLayerMenu,setShowLayerMenu]=useState(false);

  const containerRef=useRef(null);
  const abortRef=useRef(null);
  const notifTimerRef=useRef(null);
  const layerMenuRef=useRef(null);
  const debouncedQuery=useDebounce(searchQuery,350);

  // click-outside for layer menu
  useEffect(()=>{if(!showLayerMenu)return;const h=e=>{if(layerMenuRef.current&&!layerMenuRef.current.contains(e.target))setShowLayerMenu(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[showLayerMenu]);

  const showNotification=useCallback((m,type='success')=>{if(notifTimerRef.current)clearTimeout(notifTimerRef.current);setNotification({message:m,type});notifTimerRef.current=setTimeout(()=>setNotification(null),3500)},[]);
  const safeCopy=useCallback(async t=>{try{await navigator.clipboard.writeText(t)}catch{}},[]);

  // tile layers with translations
  const TILE_LAYERS=useMemo(()=>({
    'esri-satellite':{url:'/tiles/esri/{z}/{y}/{x}',attribution:'Tiles &copy; Esri',name:tl('tileSatEsri')},
    'google-satellite':{url:'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',attribution:'&copy; Google',name:tl('tileSatGoogle')},
    'osm':{url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap',name:tl('tileRoad')},
    'hybrid':{url:'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',attribution:'&copy; Google',name:tl('tileHybrid')},
  }),[tl]);

  // measurements
  const measurements=useMemo(()=>{
    if(points.length<3)return null;
    try{
      const coords=points.map(p=>[p.lng,p.lat]);
      const poly=turf.polygon([[...coords,coords[0]]]);
      const kinks=turf.kinks(poly);const hasKinks=kinks.features.length>0;
      const areaM2=turf.area(poly);const areaHa=areaM2/10000;
      let perim=0;for(let i=0;i<points.length;i++){const nx=(i+1)%points.length;perim+=turf.distance(turf.point([points[i].lng,points[i].lat]),turf.point([points[nx].lng,points[nx].lat]),{units:'meters'})}
      const bb=turf.bbox(poly);
      const wM=turf.length(turf.lineString([[bb[0],bb[1]],[bb[2],bb[1]]]),{units:'meters'});
      const hM=turf.length(turf.lineString([[bb[0],bb[1]],[bb[0],bb[3]]]),{units:'meters'});
      const cent=turf.centroid(poly);const[cLng,cLat]=cent.geometry.coordinates;
      const prov=(locationInfo?.province||'').toLowerCase();
      const tDiv=TUMBAK_PER_M2[prov]||TUMBAK_PER_M2.default;const tumb=areaM2/tDiv;
      let conf='medium';if(points.length>=6&&areaM2>100)conf='high';else if(points.length<4||areaM2<10)conf='low';
      return{areaM2:areaM2.toFixed(2),areaHa:areaHa.toFixed(4),areaTumbak:tumb.toFixed(2),tumbakDiv:tDiv,tumbakLabel:prov?`${prov} (1 tumbak \u2248 ${tDiv} m\u00B2)`:`default (1 tumbak \u2248 ${tDiv} m\u00B2)`,perimeter:perim.toFixed(2),width:wM.toFixed(2),height:hM.toFixed(2),centroid:{lat:cLat,lng:cLng},vertexCount:points.length,hasKinks,confidence:conf};
    }catch(e){console.error('Measurement error:',e);return null}
  },[points,locationInfo?.province]);

  // reverse geocoding
  const fetchLocationInfo=useCallback(async(lat,lng)=>{
    if(abortRef.current)abortRef.current.abort();
    const ctrl=new AbortController();abortRef.current=ctrl;setIsLoadingLocation(true);
    try{const res=await fetch(`${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${lang}`,{headers:{'User-Agent':NOMINATIM_UA},signal:ctrl.signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json();if(ctrl.signal.aborted)return;const a=data.address||{};setLocationInfo({displayName:data.display_name||'Unknown Location',village:a.village||a.suburb||a.neighbourhood||'',district:a.city_district||a.subdistrict||a.county||'',city:a.city||a.town||a.municipality||a.regency||'',province:a.state||'',country:a.country||'',postcode:a.postcode||'',road:a.road||''})}catch(e){if(e.name!=='AbortError')console.error('Geocoding error:',e)}finally{if(!ctrl.signal.aborted)setIsLoadingLocation(false)}
  },[lang]);
  useEffect(()=>{if(!measurements?.centroid)return;const t=setTimeout(()=>fetchLocationInfo(measurements.centroid.lat,measurements.centroid.lng),1000);return()=>clearTimeout(t)},[measurements?.centroid?.lat,measurements?.centroid?.lng,fetchLocationInfo]);

  // search
  useEffect(()=>{if(!debouncedQuery.trim()||debouncedQuery.length<2){setSearchResults([]);return}const ctrl=new AbortController();setIsSearching(true);fetch(`${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=5&accept-language=${lang}`,{headers:{'User-Agent':NOMINATIM_UA},signal:ctrl.signal}).then(r=>r.json()).then(d=>{setSearchResults(d);setIsSearching(false)}).catch(e=>{if(e.name!=='AbortError')setIsSearching(false)});return()=>ctrl.abort()},[debouncedQuery,lang]);
  const selectSearchResult=useCallback(r=>{setMapCenter([parseFloat(r.lat),parseFloat(r.lon)]);setMapZoom(18);setSearchResults([]);setSearchQuery(r.display_name.split(',').slice(0,2).join(','))},[]);

  // geolocation
  const useMyLocation=useCallback(()=>{if(!navigator.geolocation){showNotification(tl('notifGeoUnsupported'),'error');return}navigator.geolocation.getCurrentPosition(p=>{setMapCenter([p.coords.latitude,p.coords.longitude]);setMapZoom(19);showNotification(tl('notifGeoFound'))},()=>showNotification(tl('notifGeoFail'),'error'),{enableHighAccuracy:true,timeout:10000,maximumAge:30000})},[showNotification,tl]);

  // drawing
  const handleMapClick=useCallback(ll=>{setHistory(p=>[...p,points]);setPoints(p=>[...p,ll])},[points]);
  const startDrawing=useCallback(()=>{setIsDrawing(true);setPoints([]);setHistory([]);showNotification(tl('notifClickMap'))},[showNotification,tl]);
  const finishDrawing=useCallback(()=>{if(points.length<3){showNotification(tl('notifMin3'),'error');return}setIsDrawing(false);showNotification(tl('notifPolygonDone'))},[points.length,showNotification,tl]);
  const cancelDrawing=useCallback(()=>{setIsDrawing(false);setPoints([]);setHistory([])},[]);
  const undoLast=useCallback(()=>{if(history.length===0)return;setPoints(history[history.length-1]);setHistory(p=>p.slice(0,-1))},[history]);
  const clearAll=useCallback(()=>{setPoints([]);setHistory([]);setIsDrawing(false);setLocationInfo(null)},[]);
  const updateVertex=useCallback((i,ll)=>{setPoints(p=>{const n=[...p];n[i]=ll;return n})},[]);

  // share helpers
  const shareTitle=useMemo(()=>{if(!locationInfo)return tl('myLand');return[locationInfo.village,locationInfo.city,locationInfo.province,locationInfo.postcode].filter(Boolean).join(', ')||tl('myLand')},[locationInfo,tl]);
  const gmaps=useMemo(()=>measurements?.centroid?`https://www.google.com/maps?q=${measurements.centroid.lat},${measurements.centroid.lng}`:'',[measurements?.centroid]);
  const shareText=useMemo(()=>{if(!measurements)return'';const d=new Date().toLocaleString(lang==='id'?'id-ID':'en-US');return`\u{1F4CD} ${shareTitle}\n\n\u{1F4D0} ${tl('area')}: ${measurements.areaM2} m\u00B2 (${measurements.areaHa} ${tl('hectares')})\n\u{1F4CF} ${tl('perimeter')}: ${measurements.perimeter} m\n\u2194\uFE0F ${tl('estDimensions')}: ${measurements.width} m \u00D7 ${measurements.height} m\n\n\u{1F5FA}\uFE0F ${tl('centerCoords')}: ${measurements.centroid.lat.toFixed(6)}, ${measurements.centroid.lng.toFixed(6)}\n\u{1F517} ${gmaps}\n\n${tl('shareFooter')} \u2014 https://tanahku.de\n${d}`},[measurements,shareTitle,gmaps,tl,lang]);

  // capture map — composite tiles, SVG overlay and vertex markers onto a canvas at their on-screen
  // positions (getBoundingClientRect). html2canvas mis-handles Leaflet's translate3d panes, which
  // left the map black (foreignObjectRendering) or the polygon shifted from the tiles.
  const captureMap=useCallback(async()=>{
    const el=containerRef.current?.querySelector('.leaflet-container');if(!el)return null;
    const tiles=el.querySelectorAll('img.leaflet-tile');
    await Promise.allSettled([...tiles].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r})));
    await new Promise(r=>setTimeout(r,800));
    const load=src=>new Promise(r=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
    try{
      const R=el.getBoundingClientRect(),S=Math.max(window.devicePixelRatio||1,2);
      const cv=document.createElement('canvas');cv.width=Math.round(R.width*S);cv.height=Math.round(R.height*S);
      const ctx=cv.getContext('2d');ctx.scale(S,S);ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,R.width,R.height);
      for(const t of tiles){const r=t.getBoundingClientRect(),img=await load(t.currentSrc||t.src);if(img){ctx.globalAlpha=parseFloat(getComputedStyle(t).opacity)||1;ctx.drawImage(img,r.left-R.left,r.top-R.top,r.width,r.height)}}
      ctx.globalAlpha=1;
      for(const svg of el.querySelectorAll('.leaflet-overlay-pane svg')){
        const r=svg.getBoundingClientRect(),c=svg.cloneNode(true);
        c.setAttribute('xmlns','http://www.w3.org/2000/svg');c.setAttribute('width',r.width);c.setAttribute('height',r.height);c.style.transform='';
        const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)],{type:'image/svg+xml'}));
        const img=await load(url);URL.revokeObjectURL(url);if(img)ctx.drawImage(img,r.left-R.left,r.top-R.top,r.width,r.height);
      }
      for(const m of el.querySelectorAll('.leaflet-marker-icon')){
        const r=m.getBoundingClientRect();if(!r.width)continue;
        const cx=r.left-R.left+r.width/2,cy=r.top-R.top+r.height/2,rad=Math.min(r.width,r.height)/2;
        ctx.beginPath();ctx.arc(cx,cy,rad,0,2*Math.PI);ctx.fillStyle='#10b981';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();
        const label=(m.textContent||'').trim();
        if(label){ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(8,rad)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,cx,cy+.5)}
      }
      return cv.toDataURL('image/png',0.92);
    }catch(e){console.error('Capture error:',e);showNotification(tl('notifCaptureFail'),'error');return null}
  },[showNotification,tl]);

  // export PDF
  const exportToPDF=useCallback(async()=>{if(!measurements){showNotification(tl('notifMarkFirst'),'error');return}showNotification(tl('notifProcessingPDF'));const mi=await captureMap();try{const{jsPDF}=await import('jspdf');const pdf=new jsPDF('p','mm','a4');pdf.setFillColor(16,185,129);pdf.rect(0,0,210,25,'F');pdf.setTextColor(255,255,255);pdf.setFontSize(18);pdf.setFont('helvetica','bold');pdf.text(tl('pdfTitle'),105,12,{align:'center'});pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text(tl('pdfSubtitle'),105,19,{align:'center'});pdf.setTextColor(30,30,30);pdf.setFontSize(14);pdf.setFont('helvetica','bold');pdf.text(shareTitle,105,35,{align:'center'});pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.setTextColor(100,100,100);pdf.text(`${tl('pdfMeasuredOn')} ${new Date().toLocaleString(lang==='id'?'id-ID':'en-US')}`,105,41,{align:'center'});if(mi){try{pdf.addImage(mi,'PNG',15,47,180,90)}catch{}}pdf.setTextColor(30,30,30);pdf.setFontSize(12);pdf.setFont('helvetica','bold');pdf.text(tl('pdfResults'),15,148);pdf.setDrawColor(16,185,129);pdf.setLineWidth(0.5);pdf.line(15,150,195,150);pdf.setFontSize(10);let y=158;const dr=(l,v)=>{pdf.setFont('helvetica','normal');pdf.setTextColor(80,80,80);pdf.text(l,20,y);pdf.setFont('helvetica','bold');pdf.setTextColor(20,20,20);pdf.text(v,100,y);y+=6};dr(tl('pdfArea'),`${measurements.areaM2} m\u00B2 (${measurements.areaHa} ha)`);dr(tl('pdfPerimeter'),`${measurements.perimeter} m`);dr(tl('pdfDimensions'),`${measurements.width} m \u00D7 ${measurements.height} m`);dr(tl('pdfPointCount'),`${measurements.vertexCount} ${tl('pdfPoints')}`);dr(tl('pdfCenter'),`${measurements.centroid.lat.toFixed(6)}, ${measurements.centroid.lng.toFixed(6)}`);y+=2;pdf.setFont('helvetica','bold');pdf.setFontSize(12);pdf.text(tl('pdfLocation'),15,y);pdf.line(15,y+2,195,y+2);y+=10;pdf.setFontSize(10);if(locationInfo){if(locationInfo.road)dr(tl('pdfRoad'),locationInfo.road);if(locationInfo.village)dr(tl('pdfVillage'),locationInfo.village);if(locationInfo.district)dr(tl('pdfDistrict'),locationInfo.district);if(locationInfo.city)dr(tl('pdfCity'),locationInfo.city);if(locationInfo.province)dr(tl('pdfProvince'),locationInfo.province);if(locationInfo.postcode)dr(tl('pdfPostcode'),locationInfo.postcode)}try{const q=genQR(shareText,150);const qb=await(await fetch(q)).blob();const qd=await new Promise(r=>{const rd=new FileReader();rd.onloadend=()=>r(rd.result);rd.readAsDataURL(qb)});pdf.addImage(qd,'PNG',155,235,40,40);pdf.setFontSize(8);pdf.setTextColor(100,100,100);pdf.text(tl('pdfScan'),175,280,{align:'center'})}catch{}pdf.setFontSize(7);pdf.setTextColor(120,120,120);pdf.setFont('helvetica','italic');pdf.text(pdf.splitTextToSize(tl('pdfDisclaimer'),130),15,240);pdf.setFontSize(6);pdf.setTextColor(130,130,130);pdf.setFont('helvetica','normal');pdf.text(tl('copyrightPrefix')+'Lewi Verdatama'+tl('copyrightSuffix'),105,270,{align:'center'});pdf.setFontSize(7);pdf.text(`${tl('pdfPage')} \u2022 ${gmaps}`,105,290,{align:'center'});pdf.save(`tanah-${Date.now()}.pdf`);showNotification(tl('notifPDFDone'))}catch(e){console.error('PDF error:',e);showNotification(tl('notifPDFFail'),'error')}},[measurements,shareTitle,shareText,gmaps,locationInfo,captureMap,showNotification,tl,lang]);

  // share modal
  const openShareModal=useCallback(async()=>{if(!measurements){showNotification(tl('notifMarkFirst'),'error');return}setShowShareModal(true);showNotification(tl('notifPreparing'));const img=await captureMap();setShareImage(img)},[measurements,captureMap,showNotification,tl]);
  const handleShare=useCallback(async()=>{if(navigator.share){try{const sd={title:shareTitle,text:shareText};if(shareImage){const b=await(await fetch(shareImage)).blob();const f=new File([b],'tanah.png',{type:'image/png'});if(navigator.canShare?.({files:[f]}))sd.files=[f]}await navigator.share(sd)}catch(e){if(e.name!=='AbortError'){await safeCopy(shareText);showNotification(tl('notifCopied'))}}}else{await safeCopy(shareText);showNotification(tl('notifCopied'))}},[shareTitle,shareText,shareImage,safeCopy,showNotification,tl]);
  const shareWA=useCallback(()=>{window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`,'_blank')},[shareText]);
  const shareTG=useCallback(()=>{window.open(`https://t.me/share/url?url=${encodeURIComponent(gmaps)}&text=${encodeURIComponent(shareText)}`,'_blank')},[shareText,gmaps]);

  // geojson
  const exportGeoJSON=useCallback(()=>{if(!points.length)return;const coords=points.map(p=>[p.lng,p.lat]);const gj={type:'FeatureCollection',features:[{type:'Feature',properties:{name:shareTitle,area_m2:measurements?.areaM2,perimeter_m:measurements?.perimeter,measured_at:new Date().toISOString()},geometry:{type:'Polygon',coordinates:[[...coords,coords[0]]]}}]};const blob=new Blob([JSON.stringify(gj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`tanah-${Date.now()}.geojson`;a.click();URL.revokeObjectURL(url);showNotification(tl('notifGeoJSONDone'))},[points,shareTitle,measurements,showNotification,tl]);

  // confidence badge
  const conf=measurements?.confidence;
  const al={high:tl('accuracyHigh'),medium:tl('accuracyMed'),low:tl('accuracyLow')};
  const confBadge=conf&&React.createElement('span',{className:`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${conf==='high'?'bg-emerald-500/20 text-emerald-300':conf==='medium'?'bg-amber-500/20 text-amber-300':'bg-red-500/20 text-red-300'}`},React.createElement(Shield,{className:'w-3 h-3'}),al[conf]);

  // ─── Render ───
  return React.createElement(ErrorBoundary,{t:tl},
    React.createElement('div',{ref:containerRef,className:'relative w-full h-screen overflow-hidden',style:{fontFamily:'"Plus Jakarta Sans","Segoe UI",system-ui,sans-serif',background:'#0a0a0a'}},
      React.createElement('style',null,`.leaflet-container{background:#1a1a1a;font-family:inherit}.leaflet-control-attribution{font-size:9px;background:rgba(0,0,0,0.5)!important;color:#888!important}.leaflet-control-attribution a{color:#aaa!important}.vertex-number{background:#10b981;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)}@keyframes slideIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}.slide-in{animation:slideIn .3s ease-out}@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(16,185,129,0.7)}70%{box-shadow:0 0 0 12px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}.pulse-ring{animation:pulse-ring 2s infinite}.scrollbar-thin::-webkit-scrollbar{width:4px}.scrollbar-thin::-webkit-scrollbar-track{background:rgba(255,255,255,0.05)}.scrollbar-thin::-webkit-scrollbar-thumb{background:rgba(16,185,129,0.5);border-radius:4px}`),
      
      // Map
      React.createElement(MapContainer,{center:mapCenter,zoom:mapZoom,className:'absolute inset-0 z-0',zoomControl:false},
        React.createElement(TileLayer,{url:TILE_LAYERS[tileLayer].url,attribution:TILE_LAYERS[tileLayer].attribution,maxZoom:20}),
        React.createElement(MapController,{center:mapCenter,zoom:mapZoom}),
        React.createElement(MapClickHandler,{onMapClick:handleMapClick,isDrawing}),
        points.length>=3&&React.createElement(Polygon,{positions:points,pathOptions:{color:measurements?.hasKinks?'#ef4444':'#10b981',fillColor:measurements?.hasKinks?'#ef4444':'#10b981',fillOpacity:0.25,weight:3,dashArray:isDrawing?'8,8':undefined}}),
        isDrawing&&points.length===2&&React.createElement(Polygon,{positions:points,pathOptions:{color:'#10b981',fill:false,weight:3,dashArray:'8,8'}}),
        points.map((pt,i)=>React.createElement(Marker,{key:`v-${i}-${pt.lat.toFixed(6)}`,position:pt,icon:L.divIcon({className:'vertex-marker',html:`<div class="vertex-number">${i+1}</div>`,iconSize:[20,20],iconAnchor:[10,10]}),draggable:!isDrawing,eventHandlers:{dragend:e=>updateVertex(i,e.target.getLatLng())}}))
      ),

      // Top Bar
      React.createElement('div',{className:'absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none'},
        React.createElement('div',{className:'max-w-7xl mx-auto flex items-start gap-3 pointer-events-auto'},
          React.createElement('div',{className:'flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-xl border',style:{background:'rgba(10,10,10,0.85)',borderColor:'rgba(16,185,129,0.3)'}},
            React.createElement('div',{className:'w-8 h-8 rounded-lg flex items-center justify-center',style:{background:'linear-gradient(135deg,#10b981 0%,#059669 100%)'}},React.createElement(Ruler,{className:'w-4 h-4 text-white'})),
            React.createElement('div',{className:'hidden sm:block'},React.createElement('div',{className:'text-white font-bold text-sm leading-tight'},'Tanahku'),React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono'},tl('tagline')))
          ),
          React.createElement('div',{className:'flex-1 relative'},
            React.createElement('form',{onSubmit:e=>e.preventDefault()},
              React.createElement('div',{className:'relative flex items-center rounded-2xl backdrop-blur-xl border overflow-hidden',style:{background:'rgba(10,10,10,0.85)',borderColor:'rgba(255,255,255,0.1)'}},
                React.createElement(Search,{className:'w-4 h-4 text-gray-400 ml-4'}),
                React.createElement('input',{type:'text',value:searchQuery,onChange:e=>setSearchQuery(e.target.value),placeholder:tl('searchPlaceholder'),className:'flex-1 bg-transparent text-white text-sm py-3 px-3 outline-none placeholder-gray-500'}),
                isSearching&&React.createElement('div',{className:'w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-2'}),
                React.createElement('button',{type:'button',onClick:useMyLocation,className:'px-3 py-3 hover:bg-white/5 transition border-l border-white/10',title:tl('searchTitle')},React.createElement(Crosshair,{className:'w-4 h-4 text-emerald-400'}))
              )
            ),
            searchResults.length>0&&React.createElement('div',{className:'absolute top-full mt-2 w-full rounded-2xl backdrop-blur-xl border overflow-hidden slide-in',style:{background:'rgba(10,10,10,0.95)',borderColor:'rgba(255,255,255,0.1)'}},
              searchResults.map((r,i)=>React.createElement('button',{key:i,onClick:()=>selectSearchResult(r),className:'w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition border-b border-white/5 last:border-0 flex items-start gap-3'},React.createElement(MapPin,{className:'w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5'}),React.createElement('span',{className:'text-white text-xs leading-relaxed'},r.display_name)))
            )
          ),
          // Lang toggle
          React.createElement('button',{onClick:toggleLang,className:'flex items-center gap-1 px-3 py-3 rounded-2xl backdrop-blur-xl border hover:bg-white/5 transition',style:{background:'rgba(10,10,10,0.85)',borderColor:'rgba(255,255,255,0.1)'},title:'Switch language'},React.createElement(Globe,{className:'w-4 h-4 text-gray-400'}),React.createElement('span',{className:'text-white text-xs font-mono font-bold'},lang.toUpperCase())),
          // Layer menu
          React.createElement('div',{className:'relative',ref:layerMenuRef},
            React.createElement('button',{onClick:()=>setShowLayerMenu(v=>!v),className:'p-3 rounded-2xl backdrop-blur-xl border hover:bg-white/5 transition',style:{background:'rgba(10,10,10,0.85)',borderColor:'rgba(255,255,255,0.1)'}},React.createElement(Layers,{className:'w-5 h-5 text-white'})),
            showLayerMenu&&React.createElement('div',{className:'absolute right-0 top-full mt-2 rounded-2xl backdrop-blur-xl border overflow-hidden',style:{background:'rgba(10,10,10,0.95)',borderColor:'rgba(255,255,255,0.1)',minWidth:180}},
              Object.entries(TILE_LAYERS).map(([k,l])=>React.createElement('button',{key:k,onClick:()=>{setTileLayer(k);setShowLayerMenu(false)},className:`w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition text-xs ${tileLayer===k?'text-emerald-400 bg-emerald-500/10':'text-white'}`},l.name))
            )
          )
        )
      ),

      // Drawing controls
      React.createElement('div',{className:'absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]'},
        React.createElement('div',{className:'flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-xl border slide-in',style:{background:'rgba(10,10,10,0.9)',borderColor:'rgba(255,255,255,0.1)'}},
          !isDrawing?React.createElement(React.Fragment,null,
            React.createElement('button',{onClick:startDrawing,className:'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white pulse-ring transition hover:scale-105',style:{background:'linear-gradient(135deg,#10b981 0%,#059669 100%)'}},React.createElement(Plus,{className:'w-4 h-4'}),tl('markBtn')),
            points.length>0&&React.createElement(React.Fragment,null,
              React.createElement('div',{className:'w-px h-8 bg-white/10'}),
              React.createElement('button',{onClick:()=>setIsDrawing(true),className:'p-2.5 rounded-xl hover:bg-white/5 transition text-white',title:tl('continueDraw')},React.createElement(Edit3,{className:'w-4 h-4'})),
              React.createElement('button',{onClick:clearAll,className:'p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition text-white',title:tl('deleteAll')},React.createElement(Trash2,{className:'w-4 h-4'}))
            )
          ):React.createElement(React.Fragment,null,
            React.createElement('div',{className:'px-3 py-1 text-xs'},React.createElement('div',{className:'text-emerald-400 font-mono font-bold'},tl('pointsLabel',{n:points.length})),React.createElement('div',{className:'text-gray-500 text-[10px]'},tl('clickToAdd'))),
            React.createElement('div',{className:'w-px h-8 bg-white/10'}),
            React.createElement('button',{onClick:undoLast,disabled:history.length===0,className:'p-2.5 rounded-xl hover:bg-white/5 transition text-white disabled:opacity-30 disabled:cursor-not-allowed',title:tl('undo')},React.createElement(Undo2,{className:'w-4 h-4'})),
            React.createElement('button',{onClick:cancelDrawing,className:'p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition text-white',title:tl('cancel')},React.createElement(X,{className:'w-4 h-4'})),
            React.createElement('button',{onClick:finishDrawing,disabled:points.length<3,className:'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105',style:{background:'linear-gradient(135deg,#10b981 0%,#059669 100%)'}},React.createElement(CheckCircle2,{className:'w-4 h-4'}),tl('done'))
          )
        )
      ),

      // Right panel
      measurements&&showInfoPanel&&React.createElement('div',{className:'absolute top-24 right-4 z-[1000] w-80 max-h-[calc(100vh-180px)] rounded-2xl backdrop-blur-xl border overflow-hidden flex flex-col slide-in',style:{background:'rgba(10,10,10,0.92)',borderColor:measurements.hasKinks?'rgba(239,68,68,0.5)':'rgba(16,185,129,0.3)'}},
        React.createElement('div',{className:'p-4 border-b border-white/10 flex items-center justify-between',style:{background:`linear-gradient(135deg,${measurements.hasKinks?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)'} 0%, transparent 100%)`}},
          React.createElement('div',null,React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono font-bold tracking-wider'},tl('measurement')),React.createElement('div',{className:'text-white font-bold text-sm'},tl('landDetails'),' ',confBadge)),
          React.createElement('button',{onClick:()=>setShowInfoPanel(false),className:'p-1.5 rounded-lg hover:bg-white/5 transition text-gray-400'},React.createElement(X,{className:'w-4 h-4'}))
        ),
        React.createElement('div',{className:'flex-1 overflow-y-auto scrollbar-thin'},
          measurements.hasKinks&&React.createElement('div',{className:'m-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2'},React.createElement(AlertTriangle,{className:'w-4 h-4 text-red-400 flex-shrink-0 mt-0.5'}),React.createElement('div',{className:'text-xs text-red-200'},tl('warnSelfIntersect'))),
          React.createElement('div',{className:'p-4 border-b border-white/5'},React.createElement('div',{className:'text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2'},tl('totalArea')),React.createElement('div',{className:'flex items-baseline gap-2'},React.createElement('div',{className:'text-3xl font-bold text-white',style:{fontFamily:'"Space Mono",monospace'}},measurements.areaM2),React.createElement('div',{className:'text-emerald-400 font-bold text-sm'},'m\u00B2')),React.createElement('div',{className:'text-xs text-gray-400 mt-1 font-mono'},'= ',measurements.areaHa,' ',tl('hectares'),' \u2022 ',measurements.areaTumbak,' ',tl('tumbak'),React.createElement('div',{className:'text-[10px] text-gray-500'},measurements.tumbakLabel))),
          React.createElement('div',{className:'grid grid-cols-2 gap-px bg-white/5'},
            React.createElement('div',{className:'p-4 bg-black/40'},React.createElement('div',{className:'text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1'},tl('perimeter')),React.createElement('div',{className:'text-white font-bold text-lg',style:{fontFamily:'"Space Mono",monospace'}},measurements.perimeter),React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono'},tl('meters'))),
            React.createElement('div',{className:'p-4 bg-black/40'},React.createElement('div',{className:'text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1'},tl('points')),React.createElement('div',{className:'text-white font-bold text-lg',style:{fontFamily:'"Space Mono",monospace'}},measurements.vertexCount),React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono'},tl('vertices')))
          ),
          React.createElement('div',{className:'p-4 border-b border-white/5'},React.createElement('div',{className:'text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3'},tl('estDimensions')),React.createElement('div',{className:'flex items-center gap-3'},React.createElement('div',{className:'flex-1 p-3 rounded-lg bg-black/40 border border-white/5'},React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono'},tl('length')),React.createElement('div',{className:'text-white font-bold',style:{fontFamily:'"Space Mono",monospace'}},measurements.width,' m')),React.createElement('div',{className:'text-gray-500 text-xl'},'\u00D7'),React.createElement('div',{className:'flex-1 p-3 rounded-lg bg-black/40 border border-white/5'},React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono'},tl('width')),React.createElement('div',{className:'text-white font-bold',style:{fontFamily:'"Space Mono",monospace'}},measurements.height,' m'))),React.createElement('div',{className:'text-[10px] text-gray-500 mt-2 italic'},tl('bboxNote'))),
          React.createElement('div',{className:'p-4 border-b border-white/5'},React.createElement('div',{className:'text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2'},tl('centerCoords')),React.createElement('div',{className:'space-y-1.5'},React.createElement('div',{className:'flex items-center justify-between p-2 rounded-lg bg-black/40'},React.createElement('span',{className:'text-gray-400 text-xs font-mono'},'LAT'),React.createElement('span',{className:'text-white text-xs font-bold',style:{fontFamily:'"Space Mono",monospace'}},measurements.centroid.lat.toFixed(6))),React.createElement('div',{className:'flex items-center justify-between p-2 rounded-lg bg-black/40'},React.createElement('span',{className:'text-gray-400 text-xs font-mono'},'LNG'),React.createElement('span',{className:'text-white text-xs font-bold',style:{fontFamily:'"Space Mono",monospace'}},measurements.centroid.lng.toFixed(6))))),
          (isLoadingLocation||locationInfo)&&React.createElement('div',{className:'p-4 border-b border-white/5'},React.createElement('div',{className:'text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2'},tl('location')),isLoadingLocation?React.createElement('div',{className:'text-gray-400 text-xs animate-pulse'},tl('detecting')):locationInfo&&React.createElement('div',{className:'space-y-1 text-xs'},locationInfo.road&&React.createElement('div',{className:'text-white'},locationInfo.road),locationInfo.village&&React.createElement('div',{className:'text-gray-300'},locationInfo.village),locationInfo.district&&React.createElement('div',{className:'text-gray-400'},locationInfo.district),locationInfo.city&&React.createElement('div',{className:'text-emerald-400 font-semibold'},locationInfo.city),locationInfo.province&&React.createElement('div',{className:'text-gray-300'},locationInfo.province),locationInfo.postcode&&React.createElement('div',{className:'text-gray-500 font-mono pt-1'},'\u{1F4EE} ',locationInfo.postcode))),
          React.createElement('div',{className:'p-4'},React.createElement('div',{className:'flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20'},React.createElement(AlertCircle,{className:'w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5'}),React.createElement('div',{className:'text-[10px] text-amber-200/80 leading-relaxed'},tl('disclaimer'))),React.createElement('div',{className:'text-center text-[9px] text-gray-500 mt-2'},tl('copyrightPrefix'),React.createElement('a',{href:'https://www.linkedin.com/in/lewiverdatama',target:'_blank',rel:'noopener noreferrer',className:'text-emerald-400 hover:text-emerald-300 underline transition font-mono'},'Lewi Verdatama'),tl('copyrightSuffix')))
        ),
        React.createElement('div',{className:'p-3 border-t border-white/10 grid grid-cols-3 gap-2',style:{background:'rgba(0,0,0,0.4)'}},
          React.createElement('button',{onClick:openShareModal,className:'flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 transition group'},React.createElement(Share2,{className:'w-4 h-4 text-emerald-400 group-hover:scale-110 transition'}),React.createElement('span',{className:'text-[10px] text-white font-medium'},'Share')),
          React.createElement('button',{onClick:exportToPDF,className:'flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 transition group'},React.createElement(FileText,{className:'w-4 h-4 text-emerald-400 group-hover:scale-110 transition'}),React.createElement('span',{className:'text-[10px] text-white font-medium'},'PDF')),
          React.createElement('button',{onClick:exportGeoJSON,className:'flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 transition group'},React.createElement(Download,{className:'w-4 h-4 text-emerald-400 group-hover:scale-110 transition'}),React.createElement('span',{className:'text-[10px] text-white font-medium'},'GeoJSON'))
        )
      ),

      measurements&&!showInfoPanel&&React.createElement('button',{onClick:()=>setShowInfoPanel(true),className:'absolute top-24 right-4 z-[1000] p-3 rounded-2xl backdrop-blur-xl border slide-in',style:{background:'rgba(10,10,10,0.85)',borderColor:'rgba(16,185,129,0.3)'}},React.createElement(Info,{className:'w-5 h-5 text-emerald-400'})),

      // Onboarding
      points.length===0&&!isDrawing&&React.createElement('div',{className:'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999] pointer-events-none'},React.createElement('div',{className:'text-center'},React.createElement('div',{className:'inline-block px-6 py-4 rounded-2xl backdrop-blur-xl border',style:{background:'rgba(10,10,10,0.7)',borderColor:'rgba(255,255,255,0.1)'}},React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono font-bold tracking-wider mb-2'},tl('start')),React.createElement('div',{className:'text-white font-semibold text-sm mb-1'},tl('findLand')),React.createElement('div',{className:'text-gray-400 text-xs'},tl('clickMark'))))),

      // Notification
      notification&&React.createElement('div',{className:'absolute top-20 left-1/2 -translate-x-1/2 z-[2000] slide-in'},React.createElement('div',{className:`px-4 py-2 rounded-xl backdrop-blur-xl border flex items-center gap-2 text-sm ${notification.type==='error'?'border-red-500/50 text-red-300':'border-emerald-500/50 text-emerald-300'}`,style:{background:'rgba(10,10,10,0.92)'}},notification.type==='error'?React.createElement(AlertCircle,{className:'w-4 h-4'}):React.createElement(CheckCircle2,{className:'w-4 h-4'}),notification.message)),

      // Share modal
      showShareModal&&React.createElement('div',{className:'fixed inset-0 z-[3000] flex items-center justify-center p-4',style:{background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)'}},
        React.createElement('div',{className:'w-full max-w-md rounded-3xl border overflow-hidden slide-in',style:{background:'rgba(10,10,10,0.95)',borderColor:'rgba(16,185,129,0.3)'}},
          React.createElement('div',{className:'p-5 border-b border-white/10 flex items-center justify-between'},React.createElement('div',null,React.createElement('div',{className:'text-emerald-400 text-[10px] font-mono font-bold tracking-wider'},tl('share')),React.createElement('div',{className:'text-white font-bold'},tl('shareInfo'))),React.createElement('button',{onClick:()=>{setShowShareModal(false);setShareImage(null)},className:'p-1.5 rounded-lg hover:bg-white/5 transition text-gray-400'},React.createElement(X,{className:'w-5 h-5'}))),
          React.createElement('div',{className:'p-5 max-h-[70vh] overflow-y-auto scrollbar-thin'},
            React.createElement('div',{className:'rounded-2xl overflow-hidden border border-white/10 mb-5'},
              shareImage?React.createElement('img',{src:shareImage,alt:'Map preview',className:'w-full h-48 object-cover'}):React.createElement('div',{className:'w-full h-48 bg-black/40 flex items-center justify-center'},React.createElement('div',{className:'text-gray-500 text-xs animate-pulse'},tl('processingMap'))),
              React.createElement('div',{className:'p-4 bg-black/60'},React.createElement('div',{className:'text-white font-bold text-sm mb-1'},shareTitle),React.createElement('div',{className:'grid grid-cols-2 gap-3 mt-3 text-xs'},React.createElement('div',null,React.createElement('div',{className:'text-gray-500 text-[10px] uppercase font-mono'},tl('area')),React.createElement('div',{className:'text-emerald-400 font-bold',style:{fontFamily:'"Space Mono",monospace'}},measurements?.areaM2,' m\u00B2')),React.createElement('div',null,React.createElement('div',{className:'text-gray-500 text-[10px] uppercase font-mono'},tl('perimeter')),React.createElement('div',{className:'text-emerald-400 font-bold',style:{fontFamily:'"Space Mono",monospace'}},measurements?.perimeter,' m'))))
            ),
            React.createElement('div',{className:'rounded-2xl p-5 bg-white mb-5 flex flex-col items-center'},React.createElement('img',{src:genQR(shareText),alt:'QR Code',className:'w-48 h-48'}),React.createElement('div',{className:'text-gray-600 text-[10px] font-mono mt-2 uppercase'},tl('scanDetail'))),
            React.createElement('div',{className:'space-y-2'},
              React.createElement('button',{onClick:handleShare,className:'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition hover:scale-[1.02]',style:{background:'linear-gradient(135deg,#10b981 0%,#059669 100%)'}},React.createElement(Share2,{className:'w-4 h-4'}),tl('shareSystem')),
              React.createElement('div',{className:'grid grid-cols-2 gap-2'},React.createElement('button',{onClick:shareWA,className:'flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition hover:bg-emerald-600',style:{background:'#25D366'}},'WhatsApp'),React.createElement('button',{onClick:shareTG,className:'flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition hover:opacity-90',style:{background:'#0088cc'}},'Telegram')),
              React.createElement('button',{onClick:async()=>{await safeCopy(shareText);showNotification(tl('notifCopied'))},className:'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white border border-white/10 hover:bg-white/5 transition'},tl('copyText'))
            )
          )
        )
      )
    )
  );
}
