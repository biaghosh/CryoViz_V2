import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- GET - Fetch user's notifications ----------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await getDb();
    
    // 1. Get user ID
    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT id FROM [dbo].[User] WHERE email = @email');

    const dbUser = userResult.recordset[0];
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. Fetch top 50 notifications
    const result = await pool.request()
      .input('userId', sql.NVarChar, dbUser.id)
      .query(`
        SELECT TOP 50 * FROM [dbo].[Notification] 
        WHERE userId = @userId 
        ORDER BY timestamp DESC
      `);

    const formattedNotifications = result.recordset.map((notif) => ({
      ...notif,
      _id: notif.id,
      metadata: notif.metadata ? JSON.parse(notif.metadata) : null,
    }));

    return NextResponse.json({ notifications: formattedNotifications });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// ---------- POST - Create notification (admin/system) ----------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, type, title, message, priority = 'medium', metadata } = await request.json();

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pool = await getDb();
    const id = crypto.randomUUID();

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('userId', sql.NVarChar, userId)
      .input('type', sql.NVarChar, type)
      .input('title', sql.NVarChar, title)
      .input('message', sql.NVarChar, message)
      .input('priority', sql.NVarChar, priority)
      .input('metadata', sql.NVarChar, metadata ? JSON.stringify(metadata) : null)
      .input('now', sql.DateTime, new Date())
      .query(`
        INSERT INTO [dbo].[Notification] (id, userId, [type], title, [message], [read], priority, metadata, timestamp)
        VALUES (@id, @userId, @type, @title, @message, 0, @priority, @metadata, @now)
      `);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

// ---------- PUT - Mark notification as read ----------
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notificationId, action } = await request.json();
    const pool = await getDb();

    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT id FROM [dbo].[User] WHERE email = @email');

    const dbUser = userResult.recordset[0];
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === 'mark-read') {
      const updateResult = await pool.request()
        .input('id', sql.NVarChar, notificationId)
        .input('userId', sql.NVarChar, dbUser.id)
        .query('UPDATE [dbo].[Notification] SET [read] = 1 WHERE id = @id AND userId = @userId');

      if (updateResult.rowsAffected[0] === 0) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
    } else if (action === 'mark-all-read') {
      // Per your existing logic: delete all to clear the list
      await pool.request()
        .input('userId', sql.NVarChar, dbUser.id)
        .query('DELETE FROM [dbo].[Notification] WHERE userId = @userId');
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// ---------- DELETE - Delete notification ----------
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    const pool = await getDb();

    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT id FROM [dbo].[User] WHERE email = @email');

    const result = await pool.request()
      .input('id', sql.NVarChar, notificationId)
      .input('userId', sql.NVarChar, userResult.recordset[0].id)
      .query('DELETE FROM [dbo].[Notification] WHERE id = @id AND userId = @userId');

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}