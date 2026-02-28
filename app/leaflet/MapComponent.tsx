'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Bencana {
  id: number;
  jenis_bencana: string;
  lokasi: string;
  koordinat: [number, number];
  radius_meter: number; // Parameter baru untuk sebaran
  tanggal: string;
  status: string;
  dampak: {
    korban_jiwa: number;
    luka_luka: number;
    kerusakan_bangunan: number;
  };
  deskripsi: string;
}

// Fungsi untuk membuat Icon kustom berwarna tanpa perlu file gambar eksternal
const getCustomIcon = (jenis: string) => {
  let bgColor = 'bg-gray-500';
  if (jenis === 'Gempa Bumi') bgColor = 'bg-red-500';
  else if (jenis === 'Banjir') bgColor = 'bg-blue-500';
  else if (jenis === 'Karhutla') bgColor = 'bg-orange-500';
  else if (jenis === 'Tanah Longsor') bgColor = 'bg-yellow-600';

  return L.divIcon({
    className: 'custom-div-icon',
    // Menggunakan kelas Tailwind untuk styling icon titik
    html: `<div class="w-5 h-5 rounded-full border-2 border-white shadow-md ${bgColor}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// Fungsi untuk menentukan warna lingkaran radius
const getRadiusColor = (jenis: string) => {
  if (jenis === 'Gempa Bumi') return '#ef4444'; // Merah
  if (jenis === 'Banjir') return '#3b82f6'; // Biru
  if (jenis === 'Karhutla') return '#f97316'; // Oranye
  return '#ca8a04'; // Kuning (Longsor)
};

export default function MapComponent() {
  const [dataBencana, setDataBencana] = useState<Bencana[]>([]);

  useEffect(() => {
    fetch('/data-bencana.json')
      .then((res) => res.json())
      .then((data) => setDataBencana(data))
      .catch((err) => console.error("Gagal memuat data bencana:", err));
  }, []);

  return (
    <MapContainer
      center={[0.9, 100.0]} // Diarahkan lebih ke tengah Sumatra agar semua titik terlihat
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
      />

      {dataBencana.map((bencana) => (
        <div key={bencana.id}>
          {/* LINGKARAN RADIUS SEBARAN TERDAMPAK */}
          <Circle 
            center={bencana.koordinat} 
            radius={bencana.radius_meter}
            pathOptions={{ 
              color: getRadiusColor(bencana.jenis_bencana), 
              fillColor: getRadiusColor(bencana.jenis_bencana),
              fillOpacity: 0.2,
              weight: 2
            }}
          />

          {/* TITIK PUSAT BENCANA */}
          <Marker position={bencana.koordinat} icon={getCustomIcon(bencana.jenis_bencana)}>
            <Popup className="custom-popup">
              <div className="min-w-[220px]">
                <h3 className="font-bold text-lg border-b pb-1 mb-2">{bencana.jenis_bencana}</h3>
                <p className="text-sm mb-1"><strong>Lokasi:</strong> {bencana.lokasi}</p>
                <p className="text-sm mb-1"><strong>Radius Terdampak:</strong> {bencana.radius_meter / 1000} km</p>
                <p className="text-sm mb-2"><strong>Status:</strong> 
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs text-white ${bencana.status === 'Tanggap Darurat' ? 'bg-red-500' : (bencana.status === 'Waspada' ? 'bg-yellow-500' : 'bg-green-500')}`}>
                    {bencana.status}
                  </span>
                </p>
                
                <div className="bg-gray-100 p-2 rounded text-xs mb-2">
                  <p>Korban Jiwa: <strong>{bencana.dampak.korban_jiwa}</strong></p>
                  <p>Luka-luka: <strong>{bencana.dampak.luka_luka}</strong></p>
                  <p>Bangunan Rusak: <strong>{bencana.dampak.kerusakan_bangunan}</strong></p>
                </div>
                <p className="text-xs text-gray-600 italic">{bencana.deskripsi}</p>
              </div>
            </Popup>
          </Marker>
        </div>
      ))}
    </MapContainer>
  );
}