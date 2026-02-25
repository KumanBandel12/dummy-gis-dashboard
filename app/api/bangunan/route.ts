// app/api/bangunan/route.ts
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET() {
  try {
    // 1. Tulis kueri SQL Spasial
    // Kita gunakan LIMIT 1000 dulu agar browser tidak hang saat testing
    const query = `
      SELECT 
        gid, 
        namobj, 
        remark,
        -- Memaksa geometri menjadi 2D sebelum diubah ke JSON
        ST_AsGeoJSON(ST_Force2D(geom))::json as geometry 
      FROM bangunan_pt_50k 
      WHERE geom IS NOT NULL
      LIMIT 1000;
    `;
    
    // 2. Eksekusi kueri ke PostGIS
    const result = await pool.query(query);

    // 3. Rakit hasilnya menjadi standar format "FeatureCollection" GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map((row) => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          id: row.gid,
          nama: row.namobj,   
          jenis: row.remark,
        },
      })),
    };

    // 4. Kirim sebagai respon JSON ke frontend
    return NextResponse.json(geojson);

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Gagal menarik data spasial' }, { status: 500 });
  }
}