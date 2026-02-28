'use client';

import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <p className="animate-pulse text-lg font-semibold text-gray-500">Memuat Peta Geospasial...</p>
    </div>
  ),
});

export default function DashboardBencana() {
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
          
          {/* Card Statistik Cepat */}
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-3xl font-bold text-red-600">2</p>
                <p className="text-xs text-red-800 uppercase tracking-wide font-semibold mt-1">Titik Bencana</p>
             </div>
             <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <p className="text-3xl font-bold text-orange-600">17</p>
                <p className="text-xs text-orange-800 uppercase tracking-wide font-semibold mt-1">Total Luka/Korban</p>
             </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Petunjuk Update Data:</h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Untuk mengupdate titik bencana baru, cukup tambahkan data ke dalam file <code className="bg-white px-1 rounded">public/data-bencana.json</code>. Peta akan otomatis memperbarui titik lokasi.
            </p>
          </div>
        </div>
      </aside>

      {/* AREA PETA */}
      <main className="flex-1 relative z-0">
        <Map />
      </main>

    </div>
  );
}