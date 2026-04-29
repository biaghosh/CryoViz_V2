import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- GET - Fetch all feedback (admin only) ----------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedFeedback = feedback.map((f: any) => ({
      ...f,
      _id: f.id,
    }));

    return NextResponse.json({ feedback: formattedFeedback });
  } catch (error) {
    console.error("GET /api/feedback/admin error:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
