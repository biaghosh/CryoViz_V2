import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from "@azure/storage-blob";
import { NextRequest, NextResponse } from "next/server";

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    const filename = searchParams.get("filename");
    if (!dataset || !filename) {
      return NextResponse.json({ error: "Dataset and filename are required" }, { status: 400 });
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return NextResponse.json({ error: "AZURE_STORAGE_CONNECTION_STRING is not set" }, { status: 500 });
    }

    if (!connectionString.includes("DefaultEndpointsProtocol=") || !connectionString.includes("AccountName=") || !connectionString.includes("AccountKey=")) {
      return NextResponse.json({ error: "Invalid connection string format" }, { status: 500 });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("media");
    await containerClient.createIfNotExists();

    const accountName = connectionString.match(/AccountName=([^;]+)/)?.[1];
    const accountKey = connectionString.match(/AccountKey=([^;]+)/)?.[1];
    if (!accountName || !accountKey) {
      return NextResponse.json({ error: "Invalid connection string: missing AccountName or AccountKey" }, { status: 500 });
    }

    const blobName = `${dataset}/${filename}`;
    const permissions = new BlobSASPermissions();
    permissions.write = true;
    permissions.create = true;
    const startsOn = new Date(new Date().getTime() - 10 * 60 * 1000); // Start 10 minutes ago for clock skew
    const expiresOn = new Date(new Date().getTime() + 30 * 60 * 1000); // Expire in 30 minutes
    const sasToken = generateBlobSASQueryParameters({
      containerName: "media",
      blobName,
      permissions,
      startsOn,
      expiresOn,
    }, new StorageSharedKeyCredential(accountName, accountKey)).toString();

    const sasUrl = `https://${accountName}.blob.core.windows.net/media/${blobName}?${sasToken}`;
    console.log("Generated SAS URL:", sasUrl);
    console.log("SAS Token Details:", { blobName, permissions: permissions.toString(), startsOn, expiresOn });
    return NextResponse.json({ sasUrl, blobName });
  } catch (error) {
    console.error("Error generating SAS token:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(toJsonErr(error), { status: 500 });
  }
}
