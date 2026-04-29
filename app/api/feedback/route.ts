import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const feedback = await prisma.feedback.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedFeedback = feedback.map((f: any) => ({
      ...f,
      _id: f.id,
    }));

    return NextResponse.json({ feedback: formattedFeedback });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
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

    if (!type || !category || !priority || !title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = ['bug', 'feature', 'improvement', 'general'];
    const validCategories = ['ui', 'functionality', 'performance', 'data', 'other'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    if (!validTypes.includes(type)) return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    if (!validCategories.includes(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    if (!validPriorities.includes(priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        userEmail: session.user.email,
        userName: session.user.name || session.user.email,
        type,
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
        rating: rating || null,
        status: 'pending'
      }
    });

    return NextResponse.json({ 
      success: true, 
      id: feedback.id,
      message: "Feedback submitted successfully"
    });
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

// ---------- PUT - Update feedback status (admin only) ----------
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { feedbackId, status, adminResponse } = body;

    if (!feedbackId || !status) {
      return NextResponse.json({ error: "Missing feedback ID or status" }, { status: 400 });
    }

    const validStatuses = ['pending', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || user.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status,
    };

    if (adminResponse) {
      updateData.adminResponse = adminResponse;
      updateData.adminResponseAt = new Date();
    }

    const existingFeedback = await prisma.feedback.findUnique({ where: { id: feedbackId } });
    if (!existingFeedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}

// ---------- DELETE - Delete feedback (user can delete their own, admin can delete any) ----------
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get("id");

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    if (feedback.userId !== user.id && user.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.feedback.delete({ where: { id: feedbackId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
