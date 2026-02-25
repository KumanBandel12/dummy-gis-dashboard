// app/api/area-terdampak/route.ts
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET() {
  try {
    // PERHATIAN: Nama tabel dibungkus tanda kutip ganda
    const query = `
      SELECT 
        gid,
        objectid, 
        ST_AsGeoJSON(ST_Force2D(geom))::json as geometry 
      FROM "20260131-area-terdampak" 
      WHERE geom IS NOT NULL;
    `;
    
    const result = await pool.query(query);

    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map((row) => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          id: row.gid,
          jenis: row.objectid,
        },
      })),
    };

    return NextResponse.json(geojson);
  } catch (error) {
    console.error('Database error (Area Terdampak):', error);
    return NextResponse.json({ error: 'Gagal menarik data area terdampak' }, { status: 500 });
  }
}