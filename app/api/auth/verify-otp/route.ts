import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { getDb, sql, updateUserLastLogin } from "@/lib/models";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    const pool = await getDb();

    // 1. Verify OTP existence and expiration
    const otpMatch = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('otp', sql.NVarChar, otp)
      .query(`
        SELECT TOP 1 * FROM [dbo].[OTP] 
        WHERE email = @email AND otp = @otp AND expires > GETDATE()
      `);

    if (otpMatch.recordset.length === 0) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    // 2. Fetch the User
    const userResult = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, name, email, accessLevel FROM [dbo].[User] WHERE email = @email');

    const user = userResult.recordset[0];
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Update logins and lastLogin (Using our pre-migrated helper)
    await updateUserLastLogin(user.id);

    // 4. Clean up used OTPs
    await pool.request()
      .input('email', sql.NVarChar, email)
      .query('DELETE FROM [dbo].[OTP] WHERE email = @email');

    // 5. Create JWT token
    const now = Math.floor(Date.now() / 1000);
    const token = await encode({
      token: {
        name: user.name || user.email,
        email: user.email,
        sub: user.id,
        accessLevel: user.accessLevel,
        iat: now,
        exp: now + (7 * 24 * 60 * 60), // 7 days
        jti: crypto.randomUUID(),
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    // 6. Set session cookie
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    const cookieName = isProduction
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error in verify-otp API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}