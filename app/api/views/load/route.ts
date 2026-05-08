import { NextRequest, NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const datasetId = url.searchParams.get("datasetId");
    const { user } = await req.json();

    if (!id || !user || !datasetId) {
      return NextResponse.json({ error: "id, user, and datasetId are required" }, { status: 400 });
    }

    const pool = await getDb();

    // 1. Fetch the existing view
    const findResult = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('dsId', sql.NVarChar, datasetId)
      .query('SELECT * FROM [dbo].[View] WHERE id = @id AND datasetId = @dsId');

    const view = findResult.recordset[0];
    
    if (!view) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    // 2. Parse and update analytics logic
    const loadStats = view.loadStats ? JSON.parse(view.loadStats) : [];
    const now = new Date();
    
    const userStatIndex = loadStats.findIndex((stat: any) => stat.user === user);
    let updatedStats;

    if (userStatIndex !== -1) {
      // Update existing user entry
      updatedStats = [...loadStats];
      updatedStats[userStatIndex] = {
        ...updatedStats[userStatIndex],
        count: updatedStats[userStatIndex].count + 1,
        lastLoad: now
      };
    } else {
      // Add new user entry
      updatedStats = [...loadStats, { user, count: 1, lastLoad: now }];
    }

    // 3. Update the record in SQL Server
    const updateResult = await pool.request()
      .input('id', sql.NVarChar, id)
      .input('newCount', sql.Int, (view.loadCount || 0) + 1)
      .input('newStats', sql.NVarChar, JSON.stringify(updatedStats))
      .input('now', sql.DateTime, now)
      .query(`
        UPDATE [dbo].[View] 
        SET loadCount = @newCount, 
            loadStats = @newStats, 
            updatedAt = @now 
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    const updatedView = updateResult.recordset[0];

    // 4. Reconstruct for frontend expectations
    const reconstructedView = {
      ...updatedView,
      _id: updatedView.id,
      loadStats: updatedStats,
      coords: updatedView.coords ? JSON.parse(updatedView.coords) : null,
      pan: updatedView.pan ? JSON.parse(updatedView.pan) : null,
      zoom: updatedView.zoom ? JSON.parse(updatedView.zoom) : null
    };

    return NextResponse.json(
      { message: "View loaded successfully", view: reconstructedView },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error loading view:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(toJsonErr(error), { status: 500 });
  }
}