import { NextRequest, NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";

// GET — list all studies (optionally filter by institutionId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");

    const pool = await getDb();
    let query = `
      SELECT s.*, i.name as inst_name, i.abbr as inst_abbr 
      FROM [dbo].[Study] s
      LEFT JOIN [dbo].[Institution] i ON s.institutionId = i.id
    `;

    const request = pool.request();
    if (institutionId) {
      query += " WHERE s.institutionId = @instId";
      request.input("instId", sql.NVarChar, institutionId);
    }
    query += " ORDER BY s.createdAt DESC";

    const result = await request.query(query);

    const safeStudies = result.recordset.map((s) => ({
      ...s,
      _id: s.id,
      institution: {
        id: s.institutionId,
        name: s.inst_name,
        abbr: s.inst_abbr,
      },
    }));

    return NextResponse.json({ studies: safeStudies });
  } catch (error: any) {
    console.error("GET /api/studies error:", error);
    return NextResponse.json({ error: "Failed to fetch studies" }, { status: 500 });
  }
}

// POST — create a new study
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, poNo, status, institutionId } = body;

    if (!name || !institutionId) {
      return NextResponse.json({ error: "name and institutionId are required" }, { status: 400 });
    }

    const pool = await getDb();

    // 1. Validate institution exists
    const instResult = await pool.request()
      .input("id", sql.NVarChar, institutionId)
      .query("SELECT id, name, abbr FROM [dbo].[Institution] WHERE id = @id");

    const institution = instResult.recordset[0];
    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    // 2. Create the study
    const id = crypto.randomUUID();
    const now = new Date();
    await pool.request()
      .input("id", sql.NVarChar, id)
      .input("name", sql.NVarChar, name)
      .input("poNo", sql.NVarChar, poNo || null)
      .input("status", sql.NVarChar, status || "ongoing")
      .input("instId", sql.NVarChar, institutionId)
      .input("now", sql.DateTime, now)
      .query(`
        INSERT INTO [dbo].[Study] (id, name, poNo, [status], institutionId, createdAt, updatedAt)
        VALUES (@id, @name, @poNo, @status, @instId, @now, @now)
      `);

    return NextResponse.json({ 
      success: true, 
      study: { 
        _id: id, 
        id, 
        name, 
        poNo, 
        status: status || "ongoing", 
        institutionId, 
        institution 
      } 
    });
  } catch (error: any) {
    console.error("POST /api/studies error:", error);
    return NextResponse.json({ error: "Failed to create study" }, { status: 500 });
  }
}

// PUT — update a study
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, poNo, status, institutionId } = body;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const pool = await getDb();
    
    // Check existence
    const existing = await pool.request()
      .input("id", sql.NVarChar, id)
      .query("SELECT id FROM [dbo].[Study] WHERE id = @id");

    if (existing.recordset.length === 0) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    // Dynamic update builder
    const request = pool.request().input("id", sql.NVarChar, id);
    let updateFields = ["updatedAt = @now"];
    request.input("now", sql.DateTime, new Date());

    if (name !== undefined) { updateFields.push("name = @name"); request.input("name", sql.NVarChar, name); }
    if (poNo !== undefined) { updateFields.push("poNo = @poNo"); request.input("poNo", sql.NVarChar, poNo); }
    if (status !== undefined) { updateFields.push("[status] = @status"); request.input("status", sql.NVarChar, status); }
    if (institutionId !== undefined) { updateFields.push("institutionId = @instId"); request.input("instId", sql.NVarChar, institutionId); }

    await request.query(`UPDATE [dbo].[Study] SET ${updateFields.join(", ")} WHERE id = @id`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update study" }, { status: 500 });
  }
}

// DELETE — delete a study
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const pool = await getDb();

    // Relationship check (Datasets)
    const countResult = await pool.request()
      .input("id", sql.NVarChar, id)
      .query("SELECT COUNT(*) as count FROM [dbo].[Dataset] WHERE studyId = @id");

    const datasetsCount = countResult.recordset[0].count;
    if (datasetsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete study: ${datasetsCount} dataset(s) are still mapped` },
        { status: 400 }
      );
    }

    await pool.request().input("id", sql.NVarChar, id).query("DELETE FROM [dbo].[Study] WHERE id = @id");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete study" }, { status: 500 });
  }
}