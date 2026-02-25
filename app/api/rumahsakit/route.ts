// app/api/rumahsakit/route.ts
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET() {
  try {
    const query = `
      SELECT 
        gid, 
        namobj, 
        remark,
        ST_AsGeoJSON(ST_Force2D(geom))::json as geometry 
      FROM rumahsakit_pt_50k 
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
          nama: row.namobj,
          jenis: row.remark,
        },
      })),
    };

    return NextResponse.json(geojson);
  } catch (error) {
    console.error('Database error (Rumah Sakit):', error);
    return NextResponse.json({ error: 'Gagal menarik data rumah sakit' }, { status: 500 });
  }
}