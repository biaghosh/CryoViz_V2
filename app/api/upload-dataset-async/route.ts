import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface UploadStatus {
  uploadId: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  datasetName: string;
  startedAt: Date;
  completedAt?: Date;
  result?: { datasetId?: string };
  error?: string;
}

const updateUploadStatus = async (uploadId: string, userId: string, update: Partial<UploadStatus>) => {
  try {
    await prisma.uploadStatus.upsert({
      where: { uploadId },
      update: {
        ...update,
        result: update.result ? JSON.stringify(update.result) : undefined,
      },
      create: {
        uploadId,
        userId,
        status: update.status || "pending",
        progress: update.progress || 0,
        message: update.message || "Starting upload...",
        datasetName: update.datasetName || "Unknown Dataset",
        startedAt: new Date(),
        result: update.result ? JSON.stringify(update.result) : undefined
      }
    });
  } catch (error) {
    console.error("Error updating upload status:", error);
  }
};

// POST - Start async upload
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const uploadId = crypto.randomUUID();
    const userId = session.user.email;

    // Create initial upload status
    await updateUploadStatus(uploadId, userId, {
      status: "pending",
      progress: 0,
      message: "Starting upload...",
      datasetName: formData.get("name") as string || "Unknown Dataset",
    });

    // Extract Azure URLs (files already uploaded directly to Azure)
    const brightfieldTempUrl = formData.get("brightfieldTempUrl") as string;
    const fluorescentTempUrl = formData.get("fluorescentTempUrl") as string;
    const alphaTempUrl = formData.get("alphaTempUrl") as string;

    // Create new form data for Python backend
    const pythonFormData = new FormData();
    pythonFormData.append("name", formData.get("name") as string);
    pythonFormData.append("description", formData.get("description") as string);
    pythonFormData.append("institutionId", formData.get("institutionId") as string);
    pythonFormData.append("spacing", formData.get("spacing") as string);
    pythonFormData.append("uploadId", uploadId);
    pythonFormData.append("userId", userId);
    pythonFormData.append("nextBaseUrl", request.nextUrl.origin);

    // Add temporary URLs and filenames
    if (brightfieldTempUrl) {
      pythonFormData.append("brightfieldTempUrl", brightfieldTempUrl);
      pythonFormData.append("brightfieldFilename", formData.get("brightfieldFilename") as string);
    }
    if (fluorescentTempUrl) {
      pythonFormData.append("fluorescentTempUrl", fluorescentTempUrl);
      pythonFormData.append("fluorescentFilename", formData.get("fluorescentFilename") as string);
    }
    if (alphaTempUrl) {
      pythonFormData.append("alphaTempUrl", alphaTempUrl);
      pythonFormData.append("alphaFilename", formData.get("alphaFilename") as string);
    }

    // Fire-and-forget: forward to Python processor and return immediately
    const pythonUrl = process.env.PYTHON_PROCESSOR_URL || "https://cryovizwebpy.onrender.com/process-dataset";

    console.log("Calling Python processor at:", pythonUrl);

    // Do not await; let the request proceed independently
    fetch(pythonUrl, { method: "POST", body: pythonFormData }).catch((e) => {
      console.error("Failed to contact Python processor:", e);
    });

    return NextResponse.json({
      uploadId,
      message: "Upload started successfully"
    });

  } catch (error) {
    console.error("POST /api/upload-dataset-async error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start upload" },
      { status: 500 }
    );
  }
}
