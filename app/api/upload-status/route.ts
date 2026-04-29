import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createUploadNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET - Get upload status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (uploadId) {
      // Get specific upload status
      const upload = await prisma.uploadStatus.findUnique({ 
        where: { uploadId }
      });

      if (!upload || upload.userId !== session.user.email) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
      }

      // Restore JSON fields and mapped id
      const safeUpload = { 
        ...upload, 
        _id: upload.id,
        result: upload.result ? JSON.parse(upload.result) : undefined,
        error: upload.error ? JSON.parse(upload.error) : undefined
      };
      return NextResponse.json(safeUpload);
    } else {
      // Get all uploads for user, sort and limit
      const uploads = await prisma.uploadStatus.findMany({
        where: { userId: session.user.email },
        orderBy: { startedAt: 'desc' },
        take: 20
      });

      // Restore mapped id and json fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeUploads = uploads.map((u: any) => ({ 
        ...u, 
        _id: u.id,
        result: u.result ? JSON.parse(u.result) : undefined,
        error: u.error ? JSON.parse(u.error) : undefined
      }));

      return NextResponse.json({ uploads: safeUploads });
    }
  } catch (error) {
    console.error("GET /api/upload-status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get upload status" },
      { status: 500 }
    );
  }
}

// POST - Create or update upload status
export async function POST(request: NextRequest) {
  try {
    const internalSecret = request.headers.get("x-internal-secret");
    const isInternal =
      internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

    const session = isInternal ? null : await getServerSession(authOptions);
    if (!isInternal && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, status, progress, message, datasetName, result, error } = body;

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID is required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status,
      progress: Math.max(0, Math.min(100, progress || 0)),
      message: message || "",
    };

    if (status === "completed") {
      updateData.completedAt = new Date();
      updateData.result = result ? JSON.stringify(result) : undefined;
    }

    if (status === "failed") {
      updateData.completedAt = new Date();
      updateData.error = typeof error === 'object' && error !== null 
        ? JSON.stringify(error) 
        : (error ? String(error) : "Unknown error");
    }

    const userId = isInternal ? body.userId : session!.user!.email;

    // Update existing or create new via Prisma Upsert
    const uploadObj = await prisma.uploadStatus.upsert({
      where: { uploadId },
      update: updateData,
      create: {
        uploadId,
        userId,
        datasetName: datasetName || "Unknown Dataset",
        startedAt: new Date(),
        status,
        progress: Math.max(0, Math.min(100, progress || 0)),
        message: message || "",
        result: status === "completed" && result ? JSON.stringify(result) : undefined,
        error: status === "failed" ? updateData.error : undefined,
      }
    });

    // Create notification when upload completes successfully
    // We infer modification based on if it's currently completed
    if (status === "completed" && uploadObj.status === "completed") {
      try {
        const user = await prisma.user.findUnique({ where: { email: userId } });
        if (user && user.accessLevel === 'admin') {
          await createUploadNotification(
            uploadId,
            datasetName || "Unknown Dataset",
            user.id
          );
        }
      } catch (notificationError) {
        // Don't fail the upload if notification creation fails
        console.error("Failed to create upload notification:", notificationError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("POST /api/upload-status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update upload status" },
      { status: 500 }
    );
  }
}
