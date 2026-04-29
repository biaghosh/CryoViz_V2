import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- GET - Fetch user's notifications ----------
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

    // Fetch user's notifications, sorted by timestamp (newest first)
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    // Map id to _id and parse metadata for the frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedNotifications = notifications.map((notif: any) => ({
      ...notif,
      _id: notif.id,
      metadata: notif.metadata ? JSON.parse(notif.metadata) : null,
    }));

    return NextResponse.json({ notifications: formattedNotifications });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// ---------- POST - Create notification (admin/system) ----------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type, title, message, priority = 'medium', metadata } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!['upload', 'system'].includes(type)) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    if (!['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json({ error: "Invalid priority level" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        read: false,
        priority,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      id: notification.id 
    });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

// ---------- PUT - Mark notification as read ----------
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === 'mark-read' && !notificationId) {
      return NextResponse.json({ error: "Missing notification ID for mark-read action" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === 'mark-read') {
      // Find First to check ownership, then update
      const existing = await prisma.notification.findFirst({
        where: { id: notificationId, userId: user.id }
      });
      
      if (!existing) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
      });

    } else if (action === 'mark-all-read') {
      // Just delete them to match existing logic
      await prisma.notification.deleteMany({
        where: { userId: user.id }
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// ---------- DELETE - Delete notification ----------
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, userId: user.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
