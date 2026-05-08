import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, sql } from "@/lib/models";

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
    const pool = await getDb();
    const now = new Date();
    
    // Convert result object to string for SQL storage
    const resultJson = update.result ? JSON.stringify(update.result) : null;

    // Check if the record exists to mimic 'upsert'
    const checkResult = await pool.request()
      .input('uId', sql.NVarChar, uploadId)
      .query('SELECT uploadId FROM [dbo].[UploadStatus] WHERE uploadId = @uId');

    if (checkResult.recordset.length > 0) {
      // UPDATE existing
      let query = "UPDATE [dbo].[UploadStatus] SET ";
      const req = pool.request().input('uId', sql.NVarChar, uploadId);
      
      const fields: string[] = [];
      if (update.status) { fields.push("[status] = @status"); req.input('status', sql.NVarChar, update.status); }
      if (update.progress !== undefined) { fields.push("progress = @progress"); req.input('progress', sql.Float, update.progress); }
      if (update.message) { fields.push("[message] = @msg"); req.input('msg', sql.NVarChar, update.message); }
      if (resultJson) { fields.push("result = @res"); req.input('res', sql.NVarChar, resultJson); }
      if (update.status === 'completed' || update.status === 'failed') {
        fields.push("completedAt = @now");
        req.input('now', sql.DateTime, now);
      }

      if (fields.length > 0) {
        await req.query(`${query} ${fields.join(", ")} WHERE uploadId = @uId`);
      }
    } else {
      // INSERT new
      await pool.request()
        .input('uId', sql.NVarChar, uploadId)
        .input('userId', sql.NVarChar, userId)
        .input('status', sql.NVarChar, update.status || "pending")
        .input('progress', sql.Float, update.progress || 0)
        .input('msg', sql.NVarChar, update.message || "Starting upload...")
        .input('dName', sql.NVarChar, update.datasetName || "Unknown Dataset")
        .input('res', sql.NVarChar, resultJson)
        .input('now', sql.DateTime, now)
        .query(`
          INSERT INTO [dbo].[UploadStatus] (uploadId, userId, [status], progress, [message], datasetName, startedAt, result)
          VALUES (@uId, @userId, @status, @progress, @msg, @dName, @now, @res)
        `);
    }
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

    // Create initial status
    await updateUploadStatus(uploadId, userId, {
      status: "pending",
      progress: 0,
      message: "Starting upload...",
      datasetName: formData.get("name") as string || "Unknown Dataset",
    });

    const pythonFormData = new FormData();
    pythonFormData.append("name", formData.get("name") as string);
    pythonFormData.append("description", formData.get("description") as string);
    pythonFormData.append("institutionId", formData.get("institutionId") as string);
    pythonFormData.append("spacing", formData.get("spacing") as string);
    pythonFormData.append("uploadId", uploadId);
    pythonFormData.append("userId", userId);
    pythonFormData.append("nextBaseUrl", request.nextUrl.origin);

    // Map Azure temp URLs
    ["brightfield", "fluorescent", "alpha"].forEach(type => {
      const url = formData.get(`${type}TempUrl`);
      const file = formData.get(`${type}Filename`);
      if (url) {
        pythonFormData.append(`${type}TempUrl`, url as string);
        pythonFormData.append(`${type}Filename`, file as string);
      }
    });

    const pythonUrl = process.env.PYTHON_PROCESSOR_URL || "https://cryovizwebpy.onrender.com/process-dataset";

    // Fire-and-forget: Do not await
    fetch(pythonUrl, { method: "POST", body: pythonFormData }).catch((e) => {
      console.error("Failed to contact Python processor:", e);
    });

    return NextResponse.json({
      uploadId,
      message: "Upload started successfully"
    });

  } catch (error: any) {
    console.error("POST /api/upload-dataset-async error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start upload" },
      { status: 500 }
    );
  }
}