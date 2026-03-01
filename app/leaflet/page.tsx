'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import komponen peta dengan mematikan SSR
const Map = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-lg font-semibold text-gray-600">Memuat Peta Geospasial...</p>
      </div>
    </div>
  ),
});

export default function DashboardBencana() {
  const [dataBencana, setDataBencana] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mengambil data titik bencana dari API Database
  useEffect(() => {
    fetch('/api/bencana') 
      .then((res) => res.json())
      .then((data) => {
        setDataBencana(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat data dari database:", err);
        setLoading(false);
      });
  }, []);

  // Menghitung statistik secara otomatis dari data database
  const totalBencana = dataBencana.length;
  const totalKorban = dataBencana.reduce((sum, item) => {
    // Mendukung dua format (bercabang jika dari JSON lama, atau flat jika dari kolom DB lokal)
    const meninggal = item.korban_jiwa || (item.dampak && item.dampak.korban_jiwa) || 0;
    const luka = item.luka_luka || (item.dampak && item.dampak.luka_luka) || 0;
    return sum + Number(meninggal) + Number(luka);
  }, 0);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR - Panel Informasi */}
      <aside className="w-96 bg-white shadow-2xl z-10 flex flex-col border-r border-gray-200">
        <div className="p-6 bg-blue-700 text-white">
          <h1 className="text-2xl font-bold tracking-tight">GeoDisaster</h1>
          <p className="text-blue-100 text-sm mt-1">Sistem Informasi Kebencanaan Sumatra</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Ringkasan Situasi</h2>
          
          {loading ? (
            <p className="text-sm text-gray-500 animate-pulse">Menghitung data lapangan...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm">
                  <p className="text-4xl font-bold text-red-600">{totalBencana}</p>
                  <p className="text-[10px] text-red-800 uppercase tracking-wider font-bold mt-2">Titik Bencana</p>
               </div>
               <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 shadow-sm">
                  <p className="text-4xl font-bold text-orange-600">{totalKorban}</p>
                  <p className="text-[10px] text-orange-800 uppercase tracking-wider font-bold mt-2">Total Luka/Korban</p>
               </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 mt-8">
             <h3 className="text-sm font-bold text-blue-800 mb-2 border-b border-blue-200 pb-1">Keterangan Peta:</h3>
             <ul className="text-xs text-blue-800 space-y-3 mt-3">
               <li className="flex items-center">
                 <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm bg-red-500 mr-3 flex-shrink-0"></span> 
                 Gempa Bumi
               </li>
               <li className="flex items-center">
                 <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm bg-blue-500 mr-3 flex-shrink-0"></span> 
                 Banjir
               </li>
               <li className="flex items-center">
                 <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm bg-orange-500 mr-3 flex-shrink-0"></span> 
                 Karhutla / Lainnya
               </li>
             </ul>
             <p className="mt-4 text-[11px] text-blue-600 italic">
               *Gunakan ikon layer di pojok kanan atas peta untuk menampilkan data infrastruktur (Bangunan, Sungai, dll).
             </p>
          </div>
        </div>
      </aside>

      {/* AREA PETA */}
      <main className="flex-1 relative z-0">
        <Map dataBencana={dataBencana} />
      </main>

    </div>
  );
}