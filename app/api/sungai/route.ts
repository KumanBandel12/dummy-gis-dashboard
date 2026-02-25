// app/api/sungai/route.ts
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
      FROM sungai_ln_50k 
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
    console.error('Database error (Sungai):', error);
    return NextResponse.json({ error: 'Gagal menarik data sungai' }, { status: 500 });
  }
}