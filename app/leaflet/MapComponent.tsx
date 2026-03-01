'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, GeoJSON, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. Fungsi pembuat ikon dinamis berbasis HTML/CSS (Lebih aman dari bug gambar pecah)
const getDynamicIcon = (jenis: string) => {
  let bgColor = 'bg-gray-500'; // Default
  if (jenis?.toLowerCase().includes('gempa')) bgColor = 'bg-red-500';
  else if (jenis?.toLowerCase().includes('banjir')) bgColor = 'bg-blue-500';
  else if (jenis?.toLowerCase().includes('karhutla')) bgColor = 'bg-orange-500';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-6 h-6 rounded-full border-[3px] border-white shadow-md ${bgColor} flex items-center justify-center">
             <div class="w-2 h-2 bg-white rounded-full opacity-70"></div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// 2. Fungsi agar layer GeoJSON (Bangunan/Sungai) bisa memunculkan popup jika diklik
const onEachFeature = (feature: any, layer: L.Layer) => {
  if (feature.properties) {
    const popupContent = Object.keys(feature.properties)
      .map((key) => `<strong>${key}:</strong> ${feature.properties[key]}`)
      .join('<br/>');
    
    if (popupContent) {
      layer.bindPopup(`<div class="text-xs max-h-40 overflow-y-auto">${popupContent}</div>`);
    }
  }
};

// --- KOMPONEN UTAMA PETA ---
export default function MapComponent({ dataBencana }: { dataBencana: any[] }) {
  const [geoData, setGeoData] = useState({
    sungai: null,
    bangunan: null,
    rumahSakit: null,
    areaTerdampak: null
  });

  useEffect(() => {
    // Fetch data layer infrastruktur secara paralel dari API buatan tim
    Promise.all([
      fetch('/api/sungai').then(res => res.json()).catch(() => null),
      fetch('/api/bangunan').then(res => res.json()).catch(() => null),
      fetch('/api/rumahsakit').then(res => res.json()).catch(() => null),
      fetch('/api/area-terdampak').then(res => res.json()).catch(() => null)
    ]).then(([sungai, bangunan, rumahSakit, areaTerdampak]) => {
      setGeoData({ sungai, bangunan, rumahSakit, areaTerdampak });
    });
  }, []);

  return (
    <MapContainer
      center={[4.8, 96.5]} // Fokus ke area tengah/utara Sumatra (Aceh)
      zoom={7}
      style={{ height: '100%', width: '100%' }}
    >
      <LayersControl position="topright">
        
        {/* === PETA DASAR === */}
        <LayersControl.BaseLayer checked name="Peta Terang (Carto)">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Peta Satelit (Esri)">
          <TileLayer
            attribution='&copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        {/* === LAYER INFRASTRUKTUR GEOJSON === */}
        {geoData.areaTerdampak && (
          <LayersControl.Overlay checked name="Area Terdampak">
            <GeoJSON 
              data={geoData.areaTerdampak} 
              style={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, weight: 1.5, dashArray: '4' }} 
              onEachFeature={onEachFeature}
            />
          </LayersControl.Overlay>
        )}

        {/* Layer ini TIDAK dicentang (checked) secara default agar tidak lag */}
        {geoData.bangunan && (
          <LayersControl.Overlay name="Sebaran Bangunan">
            <GeoJSON 
              data={geoData.bangunan} 
              style={{ color: '#9ca3af', fillColor: '#d1d5db', weight: 1, fillOpacity: 0.6 }} 
              onEachFeature={onEachFeature}
            />
          </LayersControl.Overlay>
        )}

        {/* Layer ini TIDAK dicentang (checked) secara default agar tidak lag */}
        {geoData.sungai && (
          <LayersControl.Overlay name="Jaringan Sungai">
            <GeoJSON 
              data={geoData.sungai} 
              style={{ color: '#3b82f6', weight: 2, opacity: 0.8 }} 
              onEachFeature={onEachFeature}
            />
          </LayersControl.Overlay>
        )}

        {geoData.rumahSakit && (
          <LayersControl.Overlay checked name="Fasilitas Rumah Sakit">
            <GeoJSON 
              data={geoData.rumahSakit} 
              // Fix Ikon Rusak: Mengubah titik rumah sakit menjadi CircleMarker
              pointToLayer={(feature, latlng) => {
                return L.circleMarker(latlng, {
                  radius: 5,
                  fillColor: "#10b981", // Hijau
                  color: "#ffffff",
                  weight: 1.5,
                  opacity: 1,
                  fillOpacity: 0.9
                });
              }}
              onEachFeature={onEachFeature}
            />
          </LayersControl.Overlay>
        )}

        {/* === LAYER TITIK BENCANA (DARI DATABASE) === */}
        <LayersControl.Overlay checked name="Titik Bencana Utama">
          <LayerGroup>
            {dataBencana.map((bencana) => {
              // Mengambil koordinat, mendukung format array JSON lama atau kolom terpisah dari DB baru
              const lat = bencana.latitude || (bencana.koordinat && bencana.koordinat[0]);
              const lng = bencana.longitude || (bencana.koordinat && bencana.koordinat[1]);
              
              if (!lat || !lng) return null; // Lewati jika koordinat tidak valid

              return (
                <div key={bencana.id}>
                  {bencana.radius_meter && (
                    <Circle 
                      center={[lat, lng]} 
                      radius={bencana.radius_meter}
                      pathOptions={{ color: 'red', fillOpacity: 0.1, weight: 1 }}
                    />
                  )}
                  <Marker 
                    position={[lat, lng]} 
                    icon={getDynamicIcon(bencana.jenis_bencana)}
                  >
                    <Popup className="custom-popup">
                      <div className="min-w-[220px]">
                        <h3 className="font-bold text-lg border-b pb-1 mb-2">{bencana.jenis_bencana}</h3>
                        <p className="text-sm mb-1"><strong>Lokasi:</strong> {bencana.lokasi}</p>
                        <p className="text-sm mb-2"><strong>Status:</strong> 
                          <span className="ml-1 px-2 py-0.5 rounded text-[10px] text-white bg-gray-600 uppercase tracking-wider">
                            {bencana.status || 'Terdata'}
                          </span>
                        </p>
                        <div className="bg-gray-100 p-2 rounded text-xs">
                          <p>Meninggal: <strong>{bencana.korban_jiwa || (bencana.dampak && bencana.dampak.korban_jiwa) || 0}</strong></p>
                          <p>Luka-luka: <strong>{bencana.luka_luka || (bencana.dampak && bencana.dampak.luka_luka) || 0}</strong></p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              );
            })}
          </LayerGroup>
        </LayersControl.Overlay>

      </LayersControl>
    </MapContainer>
  );
}

// Trick untuk mengelompokkan marker React-Leaflet di dalam LayersControl
function LayerGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}