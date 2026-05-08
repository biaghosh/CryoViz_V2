import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";
import { createUploadNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET - Get upload status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");
    const pool = await getDb();

    if (uploadId) {
      const result = await pool.request()
        .input('uId', sql.NVarChar, uploadId)
        .query('SELECT * FROM [dbo].[UploadStatus] WHERE uploadId = @uId');

      const upload = result.recordset[0];

      if (!upload || upload.userId !== session.user.email) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
      }

      return NextResponse.json({ 
        ...upload, 
        _id: upload.id,
        result: upload.result ? JSON.parse(upload.result) : undefined,
        error: upload.error ? JSON.parse(upload.error) : undefined
      });
    } else {
      const result = await pool.request()
        .input('email', sql.NVarChar, session.user.email)
        .query(`
          SELECT TOP 20 * FROM [dbo].[UploadStatus] 
          WHERE userId = @email 
          ORDER BY startedAt DESC
        `);

      const safeUploads = result.recordset.map((u) => ({ 
        ...u, 
        _id: u.id,
        result: u.result ? JSON.parse(u.result) : undefined,
        error: u.error ? JSON.parse(u.error) : undefined
      }));

      return NextResponse.json({ uploads: safeUploads });
    }
  } catch (error: any) {
    console.error("GET /api/upload-status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or update upload status (Called by Python backend or Frontend)
export async function POST(request: NextRequest) {
  try {
    const internalSecret = request.headers.get("x-internal-secret");
    const isInternal = internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

    const session = isInternal ? null : await getServerSession(authOptions);
    if (!isInternal && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, status, progress, message, datasetName, result, error } = body;

    if (!uploadId) return NextResponse.json({ error: "Upload ID is required" }, { status: 400 });

    const pool = await getDb();
    const userId = isInternal ? body.userId : session!.user!.email;
    const now = new Date();

    const resultStr = result ? JSON.stringify(result) : null;
    const errorStr = typeof error === 'object' && error !== null 
      ? JSON.stringify(error) 
      : (error ? String(error) : null);

    // 1. Manual Upsert Check
    const check = await pool.request()
      .input('uId', sql.NVarChar, uploadId)
      .query('SELECT uploadId FROM [dbo].[UploadStatus] WHERE uploadId = @uId');

    if (check.recordset.length > 0) {
      // UPDATE
      let query = "UPDATE [dbo].[UploadStatus] SET [status] = @status, progress = @progress, [message] = @msg";
      const req = pool.request()
        .input('uId', sql.NVarChar, uploadId)
        .input('status', sql.NVarChar, status)
        .input('progress', sql.Float, Math.max(0, Math.min(100, progress || 0)))
        .input('msg', sql.NVarChar, message || "");

      if (status === "completed") {
        query += ", completedAt = @now, result = @res";
        req.input('now', sql.DateTime, now).input('res', sql.NVarChar, resultStr);
      } else if (status === "failed") {
        query += ", completedAt = @now, error = @err";
        req.input('now', sql.DateTime, now).input('err', sql.NVarChar, errorStr);
      }

      await req.query(query + " WHERE uploadId = @uId");
    } else {
      // INSERT
      await pool.request()
        .input('uId', sql.NVarChar, uploadId)
        .input('userId', sql.NVarChar, userId)
        .input('status', sql.NVarChar, status)
        .input('progress', sql.Float, progress || 0)
        .input('msg', sql.NVarChar, message || "")
        .input('dName', sql.NVarChar, datasetName || "Unknown Dataset")
        .input('now', sql.DateTime, now)
        .input('res', sql.NVarChar, resultStr)
        .input('err', sql.NVarChar, errorStr)
        .query(`
          INSERT INTO [dbo].[UploadStatus] (uploadId, userId, datasetName, [status], progress, [message], startedAt, result, error)
          VALUES (@uId, @userId, @dName, @status, @progress, @msg, @now, @res, @err)
        `);
    }

    // 2. Notification trigger on completion
    if (status === "completed") {
      try {
        const userRes = await pool.request()
          .input('email', sql.NVarChar, userId)
          .query('SELECT id, accessLevel FROM [dbo].[User] WHERE email = @email OR id = @email');
        
        const user = userRes.recordset[0];
        if (user) {
          await createUploadNotification(uploadId, datasetName || "Unknown Dataset", user.id);
        }
      } catch (err) {
        console.error("Failed to trigger upload notification:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/upload-status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}