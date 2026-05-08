import { NextRequest, NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";

// ---------- GET - Fetch views for a dataset ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const datasetId = searchParams.get("datasetId");

    if (!datasetId) {
      return NextResponse.json({ error: "datasetId is required" }, { status: 400 });
    }

    const pool = await getDb();
    const result = await pool.request()
      .input('dsId', sql.NVarChar, datasetId)
      .query('SELECT * FROM [dbo].[View] WHERE datasetId = @dsId');

    const formattedViews = result.recordset.map((v) => ({
      ...v,
      _id: v.id,
      coords: v.coords ? JSON.parse(v.coords) : null,
      zoom: v.zoom ? JSON.parse(v.zoom) : null,
      pan: v.pan ? JSON.parse(v.pan) : null,
      loadStats: v.loadStats ? JSON.parse(v.loadStats) : []
    }));

    return NextResponse.json({ views: formattedViews });
  } catch (error: any) {
    console.error("Error fetching views:", error);
    return NextResponse.json({ error: "Failed to fetch views" }, { status: 500 });
  }
}

// ---------- POST - Save a new 3D view ----------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, coords, zoom, pan, creator, datasetId } = body;

    if (!name || !coords || !zoom || !pan || !creator || !datasetId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pool = await getDb();

    // 1. Verify User Exists
    const userCheck = await pool.request()
      .input('email', sql.NVarChar, creator)
      .query('SELECT id FROM [dbo].[User] WHERE email = @email');

    if (userCheck.recordset.length === 0) {
      return NextResponse.json({ error: "User does not exist" }, { status: 400 });
    }

    // 2. Create the View
    const id = crypto.randomUUID();
    const now = new Date();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .input('coords', sql.NVarChar, JSON.stringify(coords))
      .input('zoom', sql.NVarChar, JSON.stringify(zoom))
      .input('pan', sql.NVarChar, JSON.stringify(pan))
      .input('creatorEmail', sql.NVarChar, creator)
      .input('dsId', sql.NVarChar, datasetId)
      .input('now', sql.DateTime, now)
      .query(`
        INSERT INTO [dbo].[View] (id, name, coords, zoom, pan, creatorEmail, datasetId, loadCount, loadStats, createdAt, updatedAt)
        VALUES (@id, @name, @coords, @zoom, @pan, @creatorEmail, @dsId, 0, '[]', @now, @now)
      `);

    return NextResponse.json({
      message: "View saved successfully",
      view: {
        id,
        _id: id,
        name,
        coords,
        zoom,
        pan,
        creator,
        datasetId,
        loadStats: [],
        createdAt: now
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving view:", error);
    return NextResponse.json({ error: "Failed to save view" }, { status: 500 });
  }
}

// ---------- PUT - Update view name ----------
export async function PUT(req: NextRequest) {
  try {
    const { id, name, datasetId } = await req.json();

    if (!id || !name || !datasetId) {
      return NextResponse.json({ error: "id, name, and datasetId are required" }, { status: 400 });
    }

    const pool = await getDb();
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('dsId', sql.NVarChar, datasetId)
      .input('name', sql.NVarChar, name.trim())
      .input('now', sql.DateTime, new Date())
      .query(`
        UPDATE [dbo].[View] 
        SET name = @name, updatedAt = @now 
        WHERE id = @id AND datasetId = @dsId
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "View name updated successfully", view: { id, name } });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update view name" }, { status: 500 });
  }
}

// ---------- DELETE - Remove a view ----------
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const datasetId = searchParams.get("datasetId");

    if (!id || !datasetId) {
      return NextResponse.json({ error: "id and datasetId are required" }, { status: 400 });
    }

    const pool = await getDb();
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('dsId', sql.NVarChar, datasetId)
      .query('DELETE FROM [dbo].[View] WHERE id = @id AND datasetId = @dsId');

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "View deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete view" }, { status: 500 });
  }
}