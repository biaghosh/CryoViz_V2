import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const datasetId = req.nextUrl.searchParams.get("datasetId");
    if (!datasetId) return NextResponse.json({ error: "Dataset ID required" }, { status: 400 });

    const pool = await getDb();
    const result = await pool.request()
      .input('dsid', sql.NVarChar, datasetId)
      .input('email', sql.NVarChar, userEmail)
      .query(`
        SELECT * FROM [dbo].[Annotation] 
        WHERE datasetId = @dsid AND userEmail = @email AND status = 'active'
      `);

    // Map database fields to frontend expected fields
    const formatted = result.recordset.map((item) => ({
      ...item,
      _id: item.id,            // Primary key (UUID)
      id: item.annotationId,   // Frontend ID
      user: item.userEmail,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const pool = await getDb();
    
    // Generate a new UUID for the database record
    const dbId = crypto.randomUUID();

    await pool.request()
      .input('id', sql.NVarChar, dbId)
      .input('annId', sql.NVarChar, body.id)
      .input('view', sql.NVarChar, body.view)
      .input('slice', sql.Int, body.slice)
      .input('x', sql.Float, body.x)
      .input('y', sql.Float, body.y)
      .input('text', sql.NVarChar, body.text)
      .input('instance', sql.Int, body.instance || 0)
      .input('email', sql.NVarChar, userEmail)
      .input('dt', sql.BigInt, Date.now())
      .input('dsid', sql.NVarChar, body.datasetId)
      .input('group', sql.NVarChar, body.groupName || "Default Group")
      .query(`
        INSERT INTO [dbo].[Annotation] 
        (id, annotationId, [view], slice, x, y, [text], instance, userEmail, datetime, datasetId, status, groupName)
        VALUES (@id, @annId, @view, @slice, @x, @y, @text, @instance, @email, @dt, @dsid, 'active')
      `);

    return NextResponse.json({ _id: dbId, id: body.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const pool = await getDb();

    // Identify by database ID (_id) or frontend ID (id)
    const query = body._id 
      ? "UPDATE [dbo].[Annotation] SET x=@x, y=@y, [text]=@text, datetime=@dt WHERE id=@target AND userEmail=@email"
      : "UPDATE [dbo].[Annotation] SET x=@x, y=@y, [text]=@text, datetime=@dt WHERE annotationId=@target AND userEmail=@email";

    await pool.request()
      .input('x', sql.Float, body.x)
      .input('y', sql.Float, body.y)
      .input('text', sql.NVarChar, body.text)
      .input('dt', sql.BigInt, body.datetime || Date.now())
      .input('target', sql.NVarChar, body._id || body.id)
      .input('email', sql.NVarChar, userEmail)
      .query(query);

    return NextResponse.json({ success: true, id: body.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { _id } = await req.json();
    const pool = await getDb();

    await pool.request()
      .input('id', sql.NVarChar, _id)
      .input('email', sql.NVarChar, userEmail)
      .query("DELETE FROM [dbo].[Annotation] WHERE id = @id AND userEmail = @email");

    return NextResponse.json({ success: true, _id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}