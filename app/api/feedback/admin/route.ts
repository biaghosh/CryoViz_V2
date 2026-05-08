import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- GET - Fetch all feedback (admin only) ----------
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
    if (!dbUser || dbUser.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // 2. Fetch all feedback entries
    const feedbackResult = await pool.request()
      .query(`
        SELECT TOP 100 * FROM [dbo].[Feedback] 
        ORDER BY createdAt DESC
      `);

    // 3. Format for Frontend
    const formattedFeedback = feedbackResult.recordset.map((f) => ({
      ...f,
      _id: f.id, // Ensure frontend compatibility with Mongo-style naming
    }));

    return NextResponse.json({ feedback: formattedFeedback });
  } catch (error: any) {
    console.error("GET /api/feedback/admin error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch feedback" }, 
      { status: 500 }
    );
  }
}