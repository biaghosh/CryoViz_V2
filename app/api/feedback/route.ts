import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general';
  category: 'ui' | 'functionality' | 'performance' | 'data' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rating?: number;
}

// ---------- GET - Fetch user's feedback ----------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await getDb();
    
    // Get user ID first
    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT id FROM [dbo].[User] WHERE email = @email');

    const dbUser = userResult.recordset[0];
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch top 50 feedback entries
    const feedbackResult = await pool.request()
      .input('userId', sql.NVarChar, dbUser.id)
      .query(`
        SELECT TOP 50 * FROM [dbo].[Feedback] 
        WHERE userId = @userId 
        ORDER BY createdAt DESC
      `);

    const formattedFeedback = feedbackResult.recordset.map((f) => ({
      ...f,
      _id: f.id, // Map for frontend compatibility
    }));

    return NextResponse.json({ feedback: formattedFeedback });
  } catch (error: any) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------- POST - Create new feedback ----------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, category, priority, title, description, rating }: FeedbackData = body;

    // Basic Validation
    if (!type || !category || !priority || !title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pool = await getDb();
    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT id FROM [dbo].[User] WHERE email = @email');

    const dbUser = userResult.recordset[0];
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const feedbackId = crypto.randomUUID();

    await pool.request()
      .input('id', sql.NVarChar, feedbackId)
      .input('userId', sql.NVarChar, dbUser.id)
      .input('email', sql.NVarChar, session.user.email)
      .input('name', sql.NVarChar, session.user.name || session.user.email)
      .input('type', sql.NVarChar, type)
      .input('category', sql.NVarChar, category)
      .input('priority', sql.NVarChar, priority)
      .input('title', sql.NVarChar, title.trim())
      .input('desc', sql.NVarChar, description.trim())
      .input('rating', sql.Int, rating || null)
      .input('status', sql.NVarChar, 'pending')
      .input('now', sql.DateTime, new Date())
      .query(`
        INSERT INTO [dbo].[Feedback] 
        (id, userId, userEmail, userName, [type], category, priority, title, [description], rating, [status], createdAt)
        VALUES (@id, @userId, @email, @name, @type, @category, @priority, @title, @desc, @rating, @status, @now)
      `);

    return NextResponse.json({ success: true, id: feedbackId });
  } catch (error: any) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------- PUT - Update feedback status (admin only) ----------
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { feedbackId, status, adminResponse } = await request.json();
    const pool = await getDb();

    // Verify Admin Status
    const userCheck = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT accessLevel FROM [dbo].[User] WHERE email = @email');

    if (userCheck.recordset[0]?.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Dynamic Update Query
    let query = "UPDATE [dbo].[Feedback] SET [status] = @status";
    const req = pool.request().input('status', sql.NVarChar, status).input('fid', sql.NVarChar, feedbackId);

    if (adminResponse) {
      query += ", adminResponse = @resp, adminResponseAt = @at";
      req.input('resp', sql.NVarChar, adminResponse).input('at', sql.DateTime, new Date());
    }
    query += " WHERE id = @fid";

    await req.query(query);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------- DELETE - Delete feedback ----------
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get("id");
    const pool = await getDb();

    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT id, accessLevel FROM [dbo].[User] WHERE email = @email');

    const dbUser = userResult.recordset[0];
    
    // Fetch ownership
    const feedbackCheck = await pool.request()
      .input('fid', sql.NVarChar, feedbackId)
      .query('SELECT userId FROM [dbo].[Feedback] WHERE id = @fid');

    const feedback = feedbackCheck.recordset[0];
    if (!feedback) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (feedback.userId !== dbUser.id && dbUser.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await pool.request().input('fid', sql.NVarChar, feedbackId).query('DELETE FROM [dbo].[Feedback] WHERE id = @fid');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}