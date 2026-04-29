import { BlobServiceClient } from "@azure/storage-blob";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ----- Types -----
type ListFile = {
  id: string;
  name: string;
  tag: string;
  url: string;
};

type PostBody = {
  dataset: string;
  filename: string;
  format: string;
  url: string;
  chunkSize?: number;
  length?: number;
  user: string;
};

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

// ----- GET -----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    if (!dataset) {
      return NextResponse.json({ error: "Dataset is required" }, { status: 400 });
    }

    const docs = await prisma.mediaDoc.findMany({
      where: { datasetId: dataset }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files: ListFile[] = docs.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      tag: doc.format,
      url: doc.URL,
    }));

    return NextResponse.json({ files });
  } catch (e: unknown) {
    console.error("Error listing files:", e);
    return NextResponse.json(toJsonErr(e), { status: 500 });
  }
}

// ----- POST -----
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as PostBody).dataset !== "string" ||
      typeof (body as PostBody).filename !== "string" ||
      typeof (body as PostBody).format !== "string" ||
      typeof (body as PostBody).url !== "string" ||
      typeof (body as PostBody).user !== "string"
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { dataset, filename, format, url, chunkSize, length, user } = body as PostBody;

    const mediaDoc = await prisma.mediaDoc.create({
      data: {
        name: filename,
        format,
        URL: url,
        chunkSize,
        length,
        userEmail: user,
        datasetId: dataset,
      }
    });

    return NextResponse.json({ message: "Metadata saved", metadata: mediaDoc });
  } catch (e: unknown) {
    console.error("Error saving metadata:", e);
    return NextResponse.json(toJsonErr(e), { status: 500 });
  }
}

// ----- DELETE -----
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    const filename = searchParams.get("filename");
    if (!dataset || !filename) {
      return NextResponse.json({ error: "Dataset and filename are required" }, { status: 400 });
    }

    const storageConn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!storageConn) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConn);
    const containerClient = blobServiceClient.getContainerClient("media");
    const blobClient = containerClient.getBlockBlobClient(`${dataset}/${filename}`);
    await blobClient.deleteIfExists();

    const result = await prisma.mediaDoc.deleteMany({
      where: { datasetId: dataset, name: filename }
    });

    return NextResponse.json({ message: "File and metadata deleted", deletedCount: result.count });
  } catch (e: unknown) {
    console.error("Error deleting file:", e);
    return NextResponse.json(toJsonErr(e), { status: 500 });
  }
}