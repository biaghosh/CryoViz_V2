import { NextRequest, NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pool = await getDb();
    
    // Using a JOIN to get the institution name from the related table
    const result = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .query(`
        SELECT 
          u.id, 
          u.email, 
          u.name, 
          u.accessLevel, 
          i.name as institution 
        FROM [dbo].[User] u
        LEFT JOIN [dbo].[Institution] i ON u.institutionId = i.id
        WHERE u.email = @email
      `);

    const user = result.recordset[0];

    if (!user) {
      return NextResponse.json({ 
        exists: false, 
        message: "User not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      user
    });

  } catch (error: any) {
    console.error("Check-user GET error:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log(">>> [API/CHECK-USER] POST request received");
  try {
    const { email } = await request.json();
    console.log(`>>> [API/CHECK-USER] Attempting DB connection for: ${email}`);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pool = await getDb();
    console.log(">>> [API/CHECK-USER] DB Pool acquired successfully");
    // Matching the JOIN logic in the POST method as well
    const result = await pool.request()
      .input("email", sql.NVarChar, email.toLowerCase().trim())
      .query(`
        SELECT 
          u.id, 
          u.email, 
          u.name, 
          u.accessLevel, 
          i.name as institution 
        FROM [dbo].[User] u
        LEFT JOIN [dbo].[Institution] i ON u.institutionId = i.id
        WHERE u.email = @email
      `);
      console.log(`>>> [API/CHECK-USER] Query complete. Found ${result.recordset.length} user(s)`);
    const user = result.recordset[0];

    if (user) {
      return NextResponse.json({ 
        exists: true,
        user 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      exists: false,
      message: "User not found"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Check-user POST error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message,
      code: error.code || "UNKNOWN_ERR"
    }, { status: 500 });
  }
}
