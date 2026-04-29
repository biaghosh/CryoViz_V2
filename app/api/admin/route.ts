import { NextResponse, NextRequest } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import prisma from "@/lib/prisma";
import {
  getDatasetMappings,
  getDatasetMappingByParent,
  createDatasetMapping,
  updateDatasetMapping,
  deleteDatasetMapping,
  getUsers,
  getDatasets,
   createInstitution,
   
  createUser,
  updateInstitution,
  updateUser,
  deleteInstitution,
  deleteUser,
  createDataset,
  updateDataset,
  deleteDataset,
  updateUserDatasets,
} from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DatasetChild = { datasetId: string };

interface CreateMappingBody {
  parentId: string;
  children: DatasetChild[];
}

interface UpdateMappingBody {
  id: string;
  parentId?: string;
  children?: DatasetChild[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  const datasetId = searchParams.get("datasetId");

  // --- 1. Multi-Database Dataset Lookup (SQL + MongoDB) ---
  if (datasetId) {
    try {
      const cleanId = String(datasetId).trim();
      let dataset: any = null;
      let organList: any[] = [];
      // A. Try SQL Server first
      dataset = await prisma.dataset.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { id: cleanId.toLowerCase() },
            { id: cleanId.toUpperCase() }
          ]
      },
      include: {
    study: {
      include: {
        institution: true
      }
    }
  }
});

     if (dataset) {
          // SQL PATH: Fetch organs AND their specific blob URLs
          const masks: any[] = await prisma.$queryRawUnsafe(`
            SELECT 
              o.name, 
              o.color,
              tm.tissueMaskBlobUrl 
            FROM TissueMask tm
            JOIN Organ o ON tm.organId = o.id
            WHERE tm.datasetId = '${dataset.id}'
          `);

          // Map the results into objects instead of just strings
          organList = masks.map((m: any) => ({
            name: m.name,
           color: m.color || "#808080", // Fallback if color is missing
            blobUrl: m.tissueMaskBlobUrl
          })).filter(m => m.name); // Ensure name exists
        } else {
        // B. Fallback to MongoDB
        const allMongoDatasets = await getDatasets();
        dataset = allMongoDatasets.find((d: any) => 
          d._id?.toString() === cleanId || d.id === cleanId
        );

        if (dataset) {
          organList = dataset.organs || [];
        }
      }

      if (!dataset) {
        return NextResponse.json({ dataset: null, error: "Dataset not found" }, { status: 404 });
      }

      // WRAP the response in a 'dataset' key to match your frontend query result.dataset
      return NextResponse.json({ 
        dataset: {
          ...dataset,
          // Safety: ensure both 'id' and '_id' exist for frontend viewers
          id: dataset.id || dataset._id?.toString(),
          _id: dataset._id?.toString() || dataset.id,
          organs: organList 
        }
      });

    } catch (e: any) {
      return NextResponse.json({ error: "Failed to load dataset details" }, { status: 500 });
    }
  }

  // --- 2. Query for a specific Mapping ---
  if (parentId) {
    const mapping = await getDatasetMappingByParent(parentId);
    return NextResponse.json({ mapping: mapping ? { ...mapping, _id: mapping._id?.toString() } : null });
  }

  // --- 3. SIDEBAR BASE DATA ---
  try {
    const [users, datasets, mappings, institutions] = await Promise.all([
      getUsers(),
      getDatasets(),
      getDatasetMappings(),
      prisma.institution.findMany() 
    ]);

    // Normalize IDs for the dataset list so the sidebar can find them
    const normalizedDatasets = (Array.isArray(datasets) ? datasets : []).map((d: any) => ({
      ...d,
      id: d.id || d._id?.toString()
    }));

    return NextResponse.json({
      users: Array.isArray(users) ? users : [],
      datasets: normalizedDatasets,
      mappings: Array.isArray(mappings) ? mappings : [],
      institutions: Array.isArray(institutions) ? institutions : []
    });
  } catch (err) {
    return NextResponse.json({ users: [], datasets: [], mappings: [], institutions: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<CreateMappingBody> = await request.json();
    const { parentId, children = [] } = body;
    if (!parentId) return NextResponse.json({ error: "parentId required" }, { status: 400 });
    const result = await createDatasetMapping({ parentId, children });
    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Partial<UpdateMappingBody> = await request.json();
    const { id, parentId, children } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const result = await updateDatasetMapping(id, { parentId, children });
    return NextResponse.json({ success: !!result.modifiedCount });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const result = await deleteDatasetMapping(id);
    return NextResponse.json({ success: !!result.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}