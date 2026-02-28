'use client';
// ============================================================
// Arahan "use client" wajib ada di baris paling atas agar
// komponen ini berjalan di sisi browser (Client Component),
// karena MapLibre GL JS membutuhkan akses ke DOM (window, canvas, dll.)
// ============================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; // Import CSS bawaan MapLibre GL JS

// ============================================================
// Definisi tipe TypeScript untuk setiap layer yang akan
// dikontrol visibilitasnya oleh pengguna.
// ============================================================
type LayerKey = 'areaTerdampak' | 'sungai' | 'bangunan' | 'rumahsakit';

interface LayerConfig {
    id: LayerKey;
    label: string;       // Label yang tampil di panel Layer Control
    color: string;       // Warna indikator di panel Layer Control
    defaultVisible: boolean; // Visibilitas awal layer saat peta pertama dimuat
}

// ============================================================
// Konfigurasi statis untuk setiap layer:
// - id        : identifier unik, digunakan sebagai key di state & sumber MapLibre
// - label     : teks yang ditampilkan di panel kontrol
// - color     : warna dot indikator di UI
// - defaultVisible : apakah layer terlihat saat pertama kali peta dimuat
// ============================================================
const LAYER_CONFIGS: LayerConfig[] = [
    {
        id: 'areaTerdampak',
        label: 'Area Terdampak',
        color: '#ef4444',      // merah
        defaultVisible: true,
    },
    {
        id: 'sungai',
        label: 'Sungai',
        color: '#3b82f6',      // biru
        defaultVisible: true,
    },
    {
        id: 'bangunan',
        label: 'Bangunan',
        color: '#f59e0b',      // kuning-oranye
        defaultVisible: false, // Dimatikan secara default agar peta tidak berat di awal
    },
    {
        id: 'rumahsakit',
        label: 'Rumah Sakit',
        color: '#10b981',      // hijau tosca
        defaultVisible: true,
    },
];

// ============================================================
// Fungsi helper: mengambil data GeoJSON dari endpoint API internal.
// Menerima path URL (string) dan mengembalikan GeoJSON object.
// ============================================================
async function fetchGeoJSON(url: string): Promise<GeoJSON.FeatureCollection> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Gagal mengambil data dari ${url}: ${response.statusText}`);
    }
    return response.json();
}

// ============================================================
// Komponen Utama: MaplibrePage
// ============================================================
export default function MaplibrePage() {
    // ------------------------------------------------------------
    // useRef: menyimpan referensi ke elemen <div> tempat peta di-render.
    // Tidak memicu re-render saat berubah, cocok untuk DOM elements.
    // ------------------------------------------------------------
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // useRef: menyimpan instance peta MapLibre GL JS.
    // Disimpan di ref agar tidak hilang saat komponen re-render.
    const mapRef = useRef<maplibregl.Map | null>(null);

    // ------------------------------------------------------------
    // useState: status loading dan error saat mengambil data dari API
    // ------------------------------------------------------------
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // ------------------------------------------------------------
    // useState: menyimpan status visibilitas masing-masing layer.
    // Dibentuk dari LAYER_CONFIGS sehingga mudah dikonfigurasi.
    // Contoh: { areaTerdampak: true, sungai: true, bangunan: false, rumahsakit: true }
    // ------------------------------------------------------------
    const [layerVisibility, setLayerVisibility] = useState<Record<LayerKey, boolean>>(
        () =>
            LAYER_CONFIGS.reduce(
                (acc, layer) => ({ ...acc, [layer.id]: layer.defaultVisible }),
                {} as Record<LayerKey, boolean>
            )
    );

    // ------------------------------------------------------------
    // useCallback: fungsi toggle visibilitas layer.
    // useCallback memastikan fungsi ini tidak dibuat ulang setiap render
    // kecuali dependensinya berubah.
    // ------------------------------------------------------------
    const toggleLayer = useCallback((layerId: LayerKey) => {
        setLayerVisibility((prev) => {
            const newVisibility = !prev[layerId];

            // Terapkan perubahan visibilitas langsung ke instance peta MapLibre
            const map = mapRef.current;
            if (map) {
                // Setiap layerId mungkin punya beberapa sub-layer di MapLibre (mis. fill + outline, atau circle + label)
                // kita gunakan konvensi penamaan: `${layerId}-*`
                const mapLayers = map.getStyle()?.layers ?? [];
                mapLayers.forEach((layer) => {
                    if (layer.id.startsWith(layerId)) {
                        map.setLayoutProperty(layer.id, 'visibility', newVisibility ? 'visible' : 'none');
                    }
                });
            }

            return { ...prev, [layerId]: newVisibility };
        });
    }, []);

    // ------------------------------------------------------------
    // useEffect utama: inisialisasi peta dan muat semua data layer.
    // Berjalan sekali setelah komponen pertama kali di-mount ke DOM.
    // Dependency array kosong [] berarti efek ini hanya jalan sekali.
    // ------------------------------------------------------------
    useEffect(() => {
        // Pastikan elemen container sudah tersedia di DOM
        if (!mapContainerRef.current) return;

        // ----------------------------------------------------------
        // Inisialisasi peta MapLibre GL JS
        // ----------------------------------------------------------
        const map = new maplibregl.Map({
            container: mapContainerRef.current, // Elemen HTML target

            // Style basemap: Carto Positron — ringan, gratis, tanpa token API
            style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',

            // Koordinat awal: disesuaikan ke Indonesia / pulau Jawa
            center: [107.6, -7.0],
            zoom: 9,

            // Attribution wajib ditampilkan sesuai lisensi Carto
            attributionControl: true,
        });

        // Simpan instance peta ke ref agar bisa diakses dari luar useEffect
        mapRef.current = map;

        // Tambahkan kontrol navigasi (zoom in/out, kompas) ke pojok kanan atas
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Tambahkan kontrol skala peta (scale bar) di pojok kiri bawah
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

        // ----------------------------------------------------------
        // Fungsi async untuk mengambil semua data dari API dan
        // menambahkannya sebagai source + layer ke dalam peta.
        // Dipanggil setelah event 'load' peta selesai.
        // ----------------------------------------------------------
        const loadAllLayers = async () => {
            try {
                setIsLoading(true);
                setLoadError(null);

                // Ambil semua data GeoJSON dari API secara paralel menggunakan Promise.all
                // Ini lebih efisien daripada fetch satu per satu (sequential)
                const [areaTerdampakData, sungaiData, bangunanData, rumahsakitData] =
                    await Promise.all([
                        fetchGeoJSON('/api/area-terdampak'),
                        fetchGeoJSON('/api/sungai'),
                        fetchGeoJSON('/api/bangunan'),
                        fetchGeoJSON('/api/rumahsakit'),
                    ]);

                // ======================================================
                // LAYER 1: Area Terdampak — Ditampilkan sebagai POLIGON
                // Source: GeoJSON dari /api/area-terdampak
                // ======================================================
                map.addSource('areaTerdampak', {
                    type: 'geojson',
                    data: areaTerdampakData,
                });

                // Sub-layer 1a: Fill (isian poligon) — warna merah transparan
                map.addLayer({
                    id: 'areaTerdampak-fill',
                    type: 'fill',
                    source: 'areaTerdampak',
                    paint: {
                        'fill-color': '#ef4444',   // Merah
                        'fill-opacity': 0.3,       // Transparan agar peta bawah tetap terlihat
                    },
                    // Visibilitas awal diambil dari state konfigurasi
                    layout: {
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'areaTerdampak')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                });

                // Sub-layer 1b: Outline poligon — lebih solid agar batas terlihat jelas
                map.addLayer({
                    id: 'areaTerdampak-outline',
                    type: 'line',
                    source: 'areaTerdampak',
                    paint: {
                        'line-color': '#b91c1c',   // Merah tua untuk garis batas
                        'line-width': 2,
                    },
                    layout: {
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'areaTerdampak')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                });

                // ======================================================
                // LAYER 2: Sungai — Ditampilkan sebagai GARIS (LineString)
                // Source: GeoJSON dari /api/sungai
                // ======================================================
                map.addSource('sungai', {
                    type: 'geojson',
                    data: sungaiData,
                });

                map.addLayer({
                    id: 'sungai-line',
                    type: 'line',
                    source: 'sungai',
                    paint: {
                        'line-color': '#3b82f6',   // Biru
                        'line-width': 2,
                        'line-opacity': 0.85,
                    },
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'sungai')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                });

                // Sub-layer tambahan: Label nama sungai — teks mengikuti arah aliran garis
                // Properti 'nama' berasal dari kolom namobj di PostGIS (via /api/sungai)
                map.addLayer({
                    id: 'sungai-label',
                    type: 'symbol',
                    source: 'sungai',
                    layout: {
                        // Ambil properti 'nama' dari GeoJSON
                        'text-field': ['coalesce', ['get', 'nama'], ''],
                        'text-font': ['Open Sans Italic'],   // Italic — konvensi kartografi untuk perairan
                        'text-size': [
                            'interpolate', ['linear'], ['zoom'],
                            9, 9,   // zoom 9 → font 9px
                            13, 12,  // zoom 13 → font 12px
                        ],
                        // Tempel teks di sepanjang garis (mengikuti arah aliran sungai)
                        'symbol-placement': 'line',
                        'symbol-spacing': 300,    // Jarak antar pengulangan teks (px)
                        'text-max-angle': 30,     // Maks kemiringan huruf mengikuti garis
                        'text-offset': [0, -0.8], // Geser sedikit ke atas garis
                        'text-optional': true,    // Tidak wajib tampil jika bertabrakan
                        // Ikut toggle bersama sungai-line
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'sungai')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                    paint: {
                        'text-color': '#1e40af',      // Biru tua, kontras di atas garis
                        'text-halo-color': '#eff6ff', // Halo putih kebiruan agar mudah dibaca
                        'text-halo-width': 1.5,
                        // Label muncul bertahap saat zoom in (tidak tampil di skala jauh)
                        'text-opacity': [
                            'interpolate', ['linear'], ['zoom'],
                            9, 0,  // belum terlihat di zoom < 9
                            10, 1,  // sepenuhnya terlihat di zoom >= 10
                        ],
                    },
                });

                // ======================================================
                // LAYER 3: Bangunan — Ditampilkan sebagai TITIK (Point)
                // Source: GeoJSON dari /api/bangunan
                // Dimatikan secara default agar peta tidak berat di awal
                // ======================================================
                map.addSource('bangunan', {
                    type: 'geojson',
                    data: bangunanData,
                });

                map.addLayer({
                    id: 'bangunan-circle',
                    type: 'circle',
                    source: 'bangunan',
                    paint: {
                        'circle-radius': 5,
                        'circle-color': '#f59e0b',   // Kuning-oranye, mencolok di atas basemap
                        'circle-stroke-color': '#92400e',
                        'circle-stroke-width': 1,
                        'circle-opacity': 0.85,
                    },
                    layout: {
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'bangunan')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                });

                // ======================================================
                // LAYER 4: Rumah Sakit — Ditampilkan sebagai TITIK besar berikon
                // Source: GeoJSON dari /api/rumahsakit
                // Dibuat lebih besar dan kontras agar mudah dibedakan dari bangunan
                // ======================================================
                map.addSource('rumahsakit', {
                    type: 'geojson',
                    data: rumahsakitData,
                });

                // Sub-layer 4a: Lingkaran luar sebagai "aura" agar lebih mencolok
                map.addLayer({
                    id: 'rumahsakit-circle-outer',
                    type: 'circle',
                    source: 'rumahsakit',
                    paint: {
                        'circle-radius': 12,
                        'circle-color': '#10b981',   // Hijau tosca
                        'circle-opacity': 0.25,
                    },
                    layout: {
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'rumahsakit')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                });

                // Sub-layer 4b: Titik inti rumah sakit
                map.addLayer({
                    id: 'rumahsakit-circle',
                    type: 'circle',
                    source: 'rumahsakit',
                    paint: {
                        'circle-radius': 7,
                        'circle-color': '#10b981',   // Hijau tosca
                        'circle-stroke-color': '#065f46',
                        'circle-stroke-width': 2,
                    },
                    layout: {
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'rumahsakit')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                });

                // Sub-layer 4c: Label nama rumah sakit di atas titik
                map.addLayer({
                    id: 'rumahsakit-label',
                    type: 'symbol',
                    source: 'rumahsakit',
                    layout: {
                        'text-field': ['get', 'nama'],        // Ambil properti 'nama' dari GeoJSON
                        'text-font': ['Open Sans Regular'],
                        'text-size': 11,
                        'text-offset': [0, 1.5],             // Geser label ke bawah titik
                        'text-anchor': 'top',
                        'text-optional': true,               // Label tidak wajib tampil jika bertabrakan
                        visibility: LAYER_CONFIGS.find((l) => l.id === 'rumahsakit')!.defaultVisible
                            ? 'visible'
                            : 'none',
                    },
                    paint: {
                        'text-color': '#065f46',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 1.5,
                    },
                });

                // ----------------------------------------------------------
                // Popup interaktif untuk Layer Rumah Sakit
                // Klik titik rumah sakit untuk melihat nama dan jenisnya
                // ----------------------------------------------------------
                map.on('click', 'rumahsakit-circle', (e) => {
                    const features = e.features;
                    if (!features || features.length === 0) return;

                    const props = features[0].properties;
                    const coordinates = (features[0].geometry as GeoJSON.Point).coordinates.slice();

                    new maplibregl.Popup()
                        .setLngLat(coordinates as [number, number])
                        .setHTML(
                            `<div style="font-family: sans-serif; padding: 4px;">
                <strong style="font-size: 14px;">🏥 ${props?.nama ?? 'Rumah Sakit'}</strong>
                <br/>
                <span style="font-size: 12px; color: #555;">Jenis: ${props?.jenis ?? '-'}</span>
              </div>`
                        )
                        .addTo(map);
                });

                // Ubah kursor menjadi pointer saat hover ke atas titik rumah sakit
                map.on('mouseenter', 'rumahsakit-circle', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'rumahsakit-circle', () => {
                    map.getCanvas().style.cursor = '';
                });

                // ----------------------------------------------------------
                // Popup interaktif untuk Layer Bangunan
                // ----------------------------------------------------------
                map.on('click', 'bangunan-circle', (e) => {
                    const features = e.features;
                    if (!features || features.length === 0) return;

                    const props = features[0].properties;
                    const coordinates = (features[0].geometry as GeoJSON.Point).coordinates.slice();

                    new maplibregl.Popup()
                        .setLngLat(coordinates as [number, number])
                        .setHTML(
                            `<div style="font-family: sans-serif; padding: 4px;">
                <strong style="font-size: 14px;">🏠 ${props?.nama ?? 'Bangunan'}</strong>
                <br/>
                <span style="font-size: 12px; color: #555;">Jenis: ${props?.jenis ?? '-'}</span>
              </div>`
                        )
                        .addTo(map);
                });

                map.on('mouseenter', 'bangunan-circle', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'bangunan-circle', () => {
                    map.getCanvas().style.cursor = '';
                });

                // Semua layer berhasil dimuat
                setIsLoading(false);
            } catch (error) {
                // Tangkap error apapun saat fetch data dan tampilkan ke UI
                console.error('Error memuat layer peta:', error);
                setLoadError(error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui');
                setIsLoading(false);
            }
        };

        // Tunggu hingga peta dan semua tile basemap selesai dimuat
        // sebelum menambahkan source dan layer data kita
        map.on('load', loadAllLayers);

        // ----------------------------------------------------------
        // Cleanup function: dijalankan saat komponen di-unmount
        // Penting untuk mencegah memory leak
        // ----------------------------------------------------------
        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []); // Dependency array kosong: efek hanya berjalan sekali

    // ============================================================
    // RENDER: Menampilkan peta dan Layer Control Panel
    // ============================================================
    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>

            {/* --------------------------------------------------------
          Elemen container peta — diisi oleh MapLibre GL JS
          melalui mapContainerRef
      -------------------------------------------------------- */}
            <div
                ref={mapContainerRef}
                style={{ width: '100%', height: '100%' }}
            />

            {/* --------------------------------------------------------
          Indikator Loading — ditampilkan saat data API sedang diambil
      -------------------------------------------------------- */}
            {isLoading && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(255,255,255,0.92)',
                        borderRadius: '12px',
                        padding: '20px 32px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 10,
                    }}
                >
                    {/* Animasi spinner sederhana */}
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            border: '4px solid #e5e7eb',
                            borderTopColor: '#3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', fontWeight: 600 }}>
                        Memuat data dari database…
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                        Mengambil data dari 4 endpoint API
                    </p>
                    {/* CSS animasi spin di-inject langsung via style tag */}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* --------------------------------------------------------
          Panel Error — ditampilkan jika ada endpoint yang gagal
      -------------------------------------------------------- */}
            {loadError && (
                <div
                    style={{
                        position: 'absolute',
                        top: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: '8px',
                        padding: '12px 20px',
                        zIndex: 10,
                        maxWidth: '400px',
                    }}
                >
                    <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                        ⚠️ Gagal memuat data
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7f1d1d' }}>
                        {loadError}
                    </p>
                </div>
            )}

            {/* =========================================================
          LAYER CONTROL PANEL
          Panel mengambang di pojok kiri atas.
          Setiap layer diwakili satu tombol toggle berwarna.
          Pengguna bisa klik untuk show/hide layer secara interaktif.
      ========================================================= */}
            <div
                style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',           // Efek blur glassmorphism
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    zIndex: 5,
                    minWidth: '200px',
                }}
            >
                {/* Judul panel */}
                <p
                    style={{
                        margin: '0 0 10px 0',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#111827',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}
                >
                    🗂 Layer Control
                </p>

                {/* Render tombol toggle untuk setiap layer dari LAYER_CONFIGS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {LAYER_CONFIGS.map((layer) => {
                        const isVisible = layerVisibility[layer.id];

                        return (
                            <button
                                key={layer.id}
                                onClick={() => toggleLayer(layer.id)}
                                title={isVisible ? `Sembunyikan layer ${layer.label}` : `Tampilkan layer ${layer.label}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: `2px solid ${isVisible ? layer.color : '#e5e7eb'}`,
                                    background: isVisible ? `${layer.color}15` : '#f9fafb',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    width: '100%',
                                    textAlign: 'left',
                                }}
                            >
                                {/* Indikator warna layer */}
                                <span
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: isVisible ? layer.color : '#d1d5db',
                                        flexShrink: 0,
                                        transition: 'background 0.2s ease',
                                    }}
                                />

                                {/* Label nama layer */}
                                <span
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: isVisible ? '#111827' : '#9ca3af',
                                        transition: 'color 0.2s ease',
                                    }}
                                >
                                    {layer.label}
                                </span>

                                {/* Ikon status aktif/nonaktif di sebelah kanan */}
                                <span
                                    style={{
                                        marginLeft: 'auto',
                                        fontSize: '11px',
                                        color: isVisible ? layer.color : '#9ca3af',
                                        fontWeight: 600,
                                    }}
                                >
                                    {isVisible ? 'ON' : 'OFF'}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Keterangan singkat di bawah panel */}
                <p
                    style={{
                        margin: '10px 0 0',
                        fontSize: '11px',
                        color: '#9ca3af',
                        lineHeight: '1.4',
                    }}
                >
                    Klik tombol untuk show/hide layer
                </p>
            </div>

            {/* --------------------------------------------------------
          Label judul peta di pojok kanan bawah
      -------------------------------------------------------- */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '40px',
                    right: '16px',
                    background: 'rgba(255,255,255,0.92)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 5,
                }}
            >
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                    Dashboard GIS — Peta Bencana
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#6b7280' }}>
                    Data: PostGIS · Basemap: Carto Positron
                </p>
            </div>
        </div>
    );
}
