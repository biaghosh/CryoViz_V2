import { BlobServiceClient } from "@azure/storage-blob";
import { NextRequest, NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";

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

// ----- GET - List metadata for a dataset -----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    if (!dataset) {
      return NextResponse.json({ error: "Dataset is required" }, { status: 400 });
    }

    const pool = await getDb();
    const result = await pool.request()
      .input('datasetId', sql.NVarChar, dataset)
      .query(`
        SELECT id, name, format, URL 
        FROM [dbo].[MediaDoc] 
        WHERE datasetId = @datasetId
      `);

    const files: ListFile[] = result.recordset.map((doc) => ({
      id: doc.id,
      name: doc.name,
      tag: doc.format,
      url: doc.URL,
    }));

    return NextResponse.json({ files });
  } catch (e: any) {
    console.error("Error listing files:", e);
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

// ----- POST - Save file metadata -----
export async function POST(req: NextRequest) {
  try {
    const body: PostBody = await req.json();
    
    if (!body.dataset || !body.filename || !body.format || !body.url || !body.user) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pool = await getDb();
    const id = crypto.randomUUID();

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, body.filename)
      .input('format', sql.NVarChar, body.format)
      .input('url', sql.NVarChar, body.url)
      .input('chunkSize', sql.Int, body.chunkSize || null)
      .input('length', sql.BigInt, body.length || null) // Use BigInt for potentially large files
      .input('userEmail', sql.NVarChar, body.user)
      .input('datasetId', sql.NVarChar, body.dataset)
      .query(`
        INSERT INTO [dbo].[MediaDoc] (id, name, format, URL, chunkSize, length, userEmail, datasetId)
        VALUES (@id, @name, @format, @url, @chunkSize, @length, @userEmail, @datasetId)
      `);

    return NextResponse.json({ 
      message: "Metadata saved", 
      metadata: { id, ...body } 
    });
  } catch (e: any) {
    console.error("Error saving metadata:", e);
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

// ----- DELETE - Remove file from storage and SQL -----
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    const filename = searchParams.get("filename");

    if (!dataset || !filename) {
      return NextResponse.json({ error: "Dataset and filename are required" }, { status: 400 });
    }

    // 1. Delete from Azure Blob Storage
    const storageConn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!storageConn) throw new Error("Storage connection string missing");

    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConn);
    const containerClient = blobServiceClient.getContainerClient("media");
    const blobClient = containerClient.getBlockBlobClient(`${dataset}/${filename}`);
    
    await blobClient.deleteIfExists();

    // 2. Delete metadata from SQL
    const pool = await getDb();
    const result = await pool.request()
      .input('datasetId', sql.NVarChar, dataset)
      .input('name', sql.NVarChar, filename)
      .query(`
        DELETE FROM [dbo].[MediaDoc] 
        WHERE datasetId = @datasetId AND name = @name
      `);

    return NextResponse.json({ 
      message: "File and metadata deleted", 
      deletedCount: result.rowsAffected[0] 
    });
  } catch (e: any) {
    console.error("Error deleting file:", e);
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}