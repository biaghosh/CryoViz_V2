import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BlobServiceClient, BlobSASPermissions } from "@azure/storage-blob";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, uploadId } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: "No file name provided" }, { status: 400 });
    }

    if (!uploadId) {
      return NextResponse.json({ error: "No upload ID provided" }, { status: 400 });
    }

    // Get Azure connection string
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return NextResponse.json({ error: "Azure storage not configured" }, { status: 500 });
    }

    const tempContainerName = process.env.AZURE_TEMP_CONTAINER || "temp-uploads";

    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Use temp container for temporary uploads
    const containerClient = blobServiceClient.getContainerClient(tempContainerName);
    
    // Create unique blob name with upload ID
    const timestamp = Date.now();
    const blobName = `temp/${uploadId}/${timestamp}_${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Generate SAS URL for direct upload (valid for 1 hour)
    const sasUploadUrl = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("cw"), // create + write permissions
      expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Generate SAS URL for reading after upload (valid for 2 hours)
    const sasReadUrl = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("r"), // read permission
      expiresOn: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    });

    // Return the SAS URLs
    return NextResponse.json({
      success: true,
      uploadUrl: sasUploadUrl,
      readUrl: sasReadUrl,
      blobName: blobName,
      message: "SAS URLs generated successfully"
    });

  } catch (error) {
    console.error("Error generating SAS URLs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate SAS URLs" },
      { status: 500 }
    );
  }
}
