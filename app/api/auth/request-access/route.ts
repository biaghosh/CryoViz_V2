import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, institution, phone, reason } = await req.json();

    if (!firstName || !lastName || !email || !institution || !phone ) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const mailOptions = {
      from: "noreply@bioinvision.com",
      to: "lokeshlo2@gmail.com",
      subject: "CryoViz Access Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; background-color: #f9f9f9;">
          <h2 style="color: #003366; text-align: center; margin-bottom: 20px;">🔐 CryoViz Access Request</h2>
    
          <p style="font-size: 16px; margin-bottom: 8px;"><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p style="font-size: 16px; margin-bottom: 8px;"><strong>Email:</strong> ${email}</p>
          <p style="font-size: 16px; margin-bottom: 8px;"><strong>Institution / Organization:</strong> ${institution}</p>
          <p style="font-size: 16px; margin-bottom: 8px;"><strong>Phone:</strong> ${phone}</p>
          <p style="font-size: 16px; margin-top: 24px;"><strong>Reason for Access:</strong></p>
          <div style="background-color: #ffffff; padding: 16px; border-left: 4px solid #0077cc; border-radius: 4px; font-size: 15px; line-height: 1.5;">
            ${reason}
          </div>
    
          <p style="font-size: 13px; color: #888; margin-top: 30px; text-align: center;">
            This request was submitted via the CryoViz Web Access Portal.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Could not send email." }, { status: 500 });
  }
}