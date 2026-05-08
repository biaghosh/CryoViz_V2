import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";

// ---------- GET - Fetch groups for the current user & dataset ----------
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const datasetId = req.nextUrl.searchParams.get("datasetId");
    if (!datasetId) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 });
    }

    const pool = await getDb();
    const result = await pool.request()
      .input('datasetId', sql.NVarChar, datasetId)
      .input('userEmail', sql.NVarChar, userEmail)
      .query(`
        SELECT * FROM [dbo].[Group] 
        WHERE datasetId = @datasetId AND userEmail = @userEmail 
        ORDER BY createdAt DESC
      `);

    const formattedGroups = result.recordset.map((group) => ({
      ...group,
      _id: group.id,
      user: group.userEmail,
      annotationCount: 0, 
    }));

    return NextResponse.json(formattedGroups);
  } catch (error: any) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch groups" }, { status: 500 });
  }
}

// ---------- POST - Create new group ----------
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { name, datasetId, description } = await req.json();

    if (!name || name.trim() === "" || !datasetId) {
      return NextResponse.json({ error: "Missing name or datasetId" }, { status: 400 });
    }

    const pool = await getDb();
    const trimmedName = name.trim();

    // 1. Check for existing group (Manual unique constraint check)
    const existing = await pool.request()
      .input('name', sql.NVarChar, trimmedName)
      .input('dsId', sql.NVarChar, datasetId)
      .input('email', sql.NVarChar, userEmail)
      .query(`
        SELECT id FROM [dbo].[Group] 
        WHERE name = @name AND datasetId = @dsId AND userEmail = @email
      `);

    if (existing.recordset.length > 0) {
      return NextResponse.json({ error: "Group with this name already exists" }, { status: 409 });
    }

    // 2. Create the group
    const id = crypto.randomUUID();
    const now = new Date();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, trimmedName)
      .input('dsId', sql.NVarChar, datasetId)
      .input('email', sql.NVarChar, userEmail)
      .input('desc', sql.NVarChar, description || null)
      .input('now', sql.DateTime, now)
      .query(`
        INSERT INTO [dbo].[Group] (id, name, datasetId, userEmail, description, createdAt, updatedAt)
        VALUES (@id, @name, @dsId, @email, @desc, @now, @now)
      `);

    return NextResponse.json({
      _id: id,
      name: trimmedName,
      datasetId,
      user: userEmail,
      createdAt: now,
      description,
      annotationCount: 0
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------- PUT - Update group ----------
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { _id, name, description } = await req.json();
    const pool = await getDb();

    const result = await pool.request()
      .input('id', sql.NVarChar, _id)
      .input('email', sql.NVarChar, userEmail)
      .input('name', sql.NVarChar, name.trim())
      .input('desc', sql.NVarChar, description || null)
      .input('now', sql.DateTime, new Date())
      .query(`
        UPDATE [dbo].[Group] 
        SET name = @name, description = @desc, updatedAt = @now
        WHERE id = @id AND userEmail = @email
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Group not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------- DELETE - Delete group ----------
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { _id, datasetId } = await req.json();
    const pool = await getDb();

    // 1. Get current group name to check for annotations
    const groupResult = await pool.request()
      .input('id', sql.NVarChar, _id)
      .input('email', sql.NVarChar, userEmail)
      .query('SELECT name FROM [dbo].[Group] WHERE id = @id AND userEmail = @email');

    const group = groupResult.recordset[0];
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // 2. Check for existing annotations
    const annCount = await pool.request()
      .input('gName', sql.NVarChar, group.name)
      .input('dsId', sql.NVarChar, datasetId)
      .input('email', sql.NVarChar, userEmail)
      .query(`
        SELECT COUNT(*) as count FROM [dbo].[Annotation] 
        WHERE groupName = @gName AND datasetId = @dsId AND userEmail = @email
      `);

    if (annCount.recordset[0].count > 0) {
      return NextResponse.json({ 
        error: "Cannot delete group with existing annotations." 
      }, { status: 400 });
    }

    // 3. Perform delete
    await pool.request()
      .input('id', sql.NVarChar, _id)
      .query('DELETE FROM [dbo].[Group] WHERE id = @id');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}