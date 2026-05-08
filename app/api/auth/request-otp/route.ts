import { NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";
import nodemailer from "nodemailer";
import { randomInt } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pool = await getDb();

    // 1. Check if user exists
    const userCheck = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM [dbo].[User] WHERE email = @email');

    if (userCheck.recordset.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Generate OTP
    const otp = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Store OTP in database (Generating a unique ID for the OTP record)
    const otpId = crypto.randomUUID();
    await pool.request()
      .input('id', sql.NVarChar, otpId)
      .input('email', sql.NVarChar, email)
      .input('otp', sql.NVarChar, otp)
      .input('expires', sql.DateTime, expiresAt)
      .query(`
        INSERT INTO [dbo].[OTP] (id, email, otp, expires)
        VALUES (@id, @email, @otp, @expires)
      `);

    console.log("[OTP] Generated for:", email);

    // 4. Send email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const result = await transporter.sendMail({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: "Your One-Time Passcode (OTP) for CryoViz Web Access",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; background-color: #f9f9f9;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://your-domain.com/BIVLogo.png" alt="BioInvision Logo" style="max-height: 60px;" />
          </div>  
          <h2 style="color: #003366; text-align: center;">CryoViz Web Access Verification</h2>
          <p style="font-size: 16px; color: #333; text-align: center; margin-bottom: 24px;">
            Use the code below to verify your email and access the CryoViz Web platform.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 28px; letter-spacing: 8px; color: #0077cc; font-weight: bold; background-color: #fff; padding: 12px 24px; border-radius: 8px; border: 1px solid #0077cc;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #555; text-align: center;">
            This code is valid for the next <strong>10 minutes</strong>. Please do not share it with anyone.
          </p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 24px;">
            © ${new Date().getFullYear()} BioInvision, Inc. All rights reserved.
          </p>
        </div>
      `,
      text: `Your OTP for CryoViz Web access is: ${otp}. Valid for 10 minutes.`,
    });

    // Check for failure in delivery
    if (result.rejected?.length > 0) {
      throw new Error(`Email to ${email} was rejected`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send OTP" },
      { status: 500 }
    );
  }
}