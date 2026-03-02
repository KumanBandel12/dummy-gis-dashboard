"use client";

import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
// Import modul styling lengkap
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
// Import untuk interaksi
import Select from 'ol/interaction/Select';
import { pointerMove } from 'ol/events/condition';

export default function OpenLayersOptimizedMap() {
  const mapElement = useRef();
  // State untuk menyimpan data yang diklik
  const [selectedHospital, setSelectedHospital] = useState(null);

  useEffect(() => {
    // ==========================================================
    // KELEBIHAN 1: Robust Styling System (Deklaratif & Dinamis)
    // OpenLayers unggul dalam memanipulasi tampilan berdasarkan data atribut.
    // ==========================================================
    
    // Define warna berdasarkan 'jenis' rumah sakit
    const getClrs = (jenis) => {
      return jenis === 'Rumah Sakit Umum' ? 'rgba(30, 144, 255, 0.8)' : 'rgba(255, 69, 0, 0.8)';
    };

    // Fungsi Style Dinamis: Dijalankan untuk setiap feature
    const hospitalStyleFunction = (feature) => {
      const jenis = feature.get('jenis');
      const nama = feature.get('nama');

      return new Style({
        // Styling Titik (Geometri)
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: getClrs(jenis) }),
          stroke: new Stroke({ color: 'white', width: 2 }),
        }),
        // Styling Teks Labe (Hanya muncul jika zoom cukup dekat)
        // OL unggul dalam kontrol decluttering label.
        text: new Text({
          text: nama,
          font: 'bold 12px Calibri,sans-serif',
          fill: new Fill({ color: '#333' }),
          stroke: new Stroke({ color: 'white', width: 3 }),
          offsetY: -15, // Posisi teks di atas titik
          exceedLength: false, // Label tidak tumpang tindih
        }),
      });
    };

    // Style khusus saat fitur dipilih (hover/klik)
    const selectStyle = new Style({
      image: new CircleStyle({
        radius: 12, // Membesar
        fill: new Fill({ color: 'rgba(50, 205, 50, 0.9)' }), // Berubah jadi hijau
        stroke: new Stroke({ color: 'white', width: 3 }),
      }),
    });

    // 1. Setup Source Data
    const vectorSource = new VectorSource({
      url: '/api/rumahsakit',
      format: new GeoJSON(),
    });

    // 2. Setup Layer dengan Dinamis Style
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: hospitalStyleFunction, // Menggunakan fungsi style di atas
      declutter: true, // Mencegah label tumpang tindih (Fitur unggulan OL)
    });

    // 3. Inisialisasi Peta
    const map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM(),
          className: 'bw-map', // Bisa manipulasi CSS layer (misal jadi hitam putih)
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([97.0, 4.3]), // Disesuaikan agar data terlihat semua
        zoom: 8,
      }),
    });

    // ==========================================================
    // KELEBIHAN 2: Powerful Interaction & Event Handling
    // Menangani interaksi mouse dengan presisi tinggi.
    // ==========================================================

    // A. Interaksi Hover (Pointer Move) - Mengubah kursor
    const hoverInteraction = new Select({
      condition: pointerMove,
      style: selectStyle, // Gunakan style khusus saat di-hover
      layers: [vectorLayer],
    });
    map.addInteraction(hoverInteraction);

    // B. Interaksi Klik - Menampilkan data di panel samping
    map.on('click', (event) => {
      // Mencari fitur yang diklik
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat);
      
      if (feature) {
        // Ambil properti data dari PostGIS
        setSelectedHospital(feature.getProperties());
      } else {
        setSelectedHospital(null); // Reset jika klik di area kosong
      }
    });

    // CSS manipulasi untuk membuat base map jadi agak grayscale (opsional, estetik)
    const styles = document.createElement('style');
    styles.innerHTML = `.bw-map { filter: grayscale(80%) invert(5%) contrast(90%); }`;
    document.head.appendChild(styles);

    // Cleanup
    return () => {
      map.setTarget(null);
      document.head.removeChild(styles);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '10px 20px', background: '#2c3e50', color: 'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{margin:0}}>🌍 Dashboard GIS Bencana - Naufal</h2>
        <span style={{background:'#e74c3c', padding:'5px 10px', borderRadius:'20px', fontSize:'12px'}}>PoC OpenLayers + PostGIS</span>
      </header>
      
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Kontainer Peta */}
        <div ref={mapElement} style={{ flex: 1 }}></div>

        {/* ==========================================================
            KELEBIHAN 3: Kemudahan Integrasi dengan UI Framework (React)
            Data atribut PostGIS mudah ditampilkan di luar canvas peta.
            ========================================================== */}
        {/* Panel Samping (Akan muncul jika ada data yang diklik) */}
        {selectedHospital && (
          <div style={{
            position: 'absolute', top: '20px', right: '20px',
            width: '300px', background: 'rgba(255,255,255,0.95)',
            padding: '20px', borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: 10, border: '1px solid #ddd'
          }}>
            <button onClick={() => setSelectedHospital(null)} style={{float:'right', border:'none', background:'none', cursor:'pointer'}}>✖</button>
            <h3 style={{color: '#e74c3c', marginTop: 0}}>Detail Fasilitas</h3>
            <hr/>
            <p><strong>Nama:</strong> <br/> {selectedHospital.nama}</p>
            <p><strong>Jenis:</strong> <br/> {selectedHospital.jenis}</p>
            <p style={{fontSize:'12px', color:'#777'}}>
              ID: {selectedHospital.id} <br/>
              Kodr: {selectedHospital.geometry.getCoordinates()[0].toFixed(5)}, {selectedHospital.geometry.getCoordinates()[1].toFixed(5)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}