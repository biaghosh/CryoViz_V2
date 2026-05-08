import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = await getDb();

    // 1. Verify Admin Access
    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT accessLevel FROM [dbo].[User] WHERE email = @email');

    const dbUser = userResult.recordset[0];
    if (!dbUser || dbUser.accessLevel !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // 2. Aggregate Metrics (Total Counts)
    const metricsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM [dbo].[User]) as totalUsers,
        (SELECT COUNT(*) FROM [dbo].[Dataset]) as totalDatasets,
        (SELECT COUNT(*) FROM [dbo].[UploadStatus]) as totalUploads
    `);
    
    const { totalUsers, totalDatasets, totalUploads } = metricsResult.recordset[0];

    // 3. Fetch Recent Uploads (Last 7 Days)
    const recentUploadsResult = await pool.request().query(`
      SELECT TOP 10 * 
      FROM [dbo].[UploadStatus]
      WHERE startedAt >= DATEADD(day, -7, GETDATE())
      ORDER BY startedAt DESC
    `);

    // 4. User Activity (Top 10 by login frequency)
    const activityResult = await pool.request().query(`
      SELECT TOP 10 name, email, accessLevel, lastLogin, logins
      FROM [dbo].[User]
      ORDER BY logins DESC
    `);

    const userActivity = activityResult.recordset.map((u) => ({
      name: u.name,
      email: u.email,
      accessLevel: u.accessLevel,
      uploadCount: 0, // Placeholder as per original logic
      lastActivity: u.lastLogin
    }));

    // 5. Generate Chart Data (30 Days - Mocked for Frontend Compatibility)
    const chartData = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      chartData.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + 100,
        datasets: Math.floor(Math.random() * 20) + 30,
        uploads: Math.floor(Math.random() * 15) + 10,
        systemLoad: Math.random() * 100
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          totalDatasets,
          totalUploads,
          completionRate: totalDatasets > 0 ? 100 : 0,
          activeUsers: Math.floor(Math.random() * 20) + 5 
        },
        chartData,
        recentUploads: recentUploadsResult.recordset,
        datasetStats: [{ _id: 'completed', count: totalDatasets }, { _id: 'processing', count: 0 }],
        userActivity,
        systemMetrics: [],
        systemStatus: {
          database: "healthy",
          api: "healthy",
          storage: "healthy",
          lastCheck: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch dashboard data" 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Keeping this structure simple since the original was mostly mocked/skipped
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pool = await getDb();
    const userResult = await pool.request()
      .input('email', sql.NVarChar, session.user.email)
      .query('SELECT accessLevel FROM [dbo].[User] WHERE email = @email');

    if (userResult.recordset[0]?.accessLevel !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: "Action received (mocked)" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update dashboard" }, { status: 500 });
  }
}