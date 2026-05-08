// app/api/dataset-mappings/route.ts
import { NextResponse, NextRequest } from "next/server";
import {
  getDatasetMappingByParent,
  createDatasetMapping,
  updateDatasetMapping,
  deleteDatasetMapping,
  // Note: getDatasetMappings needs to be implemented in your lib/models 
  // if you want to fetch all mappings, otherwise keep it focused on parentId.
} from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Type-safe interfaces matching your new SQL logic
type DatasetChild = { datasetId: string; alias?: string; order?: number };

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

  try {
    if (parentId) {
      const mapping = await getDatasetMappingByParent(parentId);
      // Removed .toString() logic as SQL IDs are already strings
      return NextResponse.json({ mapping: mapping || null });
    }
    
    // If you need a 'get all' functionality, ensure getDatasetMappings() 
    // is updated in your models to handle the SQL join.
    return NextResponse.json({ error: "parentId is required for this endpoint" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<CreateMappingBody> = await request.json();
    const { parentId, children = [] } = body;

    if (!parentId) {
      return NextResponse.json({ error: "parentId required" }, { status: 400 });
    }

    // Validation logic
    const childIds = children.map((c) => c.datasetId);
    if (childIds.includes(parentId)) {
      return NextResponse.json({ error: "Parent cannot be a child" }, { status: 400 });
    }
    if (new Set(childIds).size !== childIds.length) {
      return NextResponse.json({ error: "Duplicate child datasetIds" }, { status: 400 });
    }

    // result.insertedId is now a UUID string from the createDatasetMapping SQL function
    const mappingId = await createDatasetMapping(parentId, children);
    return NextResponse.json({ success: true, id: mappingId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Partial<UpdateMappingBody> = await request.json();
    const { id, parentId, children } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (children) {
      const childIds = children.map((c) => c.datasetId);
      if (parentId && childIds.includes(parentId)) {
        return NextResponse.json({ error: "Parent cannot be a child" }, { status: 400 });
      }
    }

    const result = await updateDatasetMapping(id, { children });
    return NextResponse.json({ success: !!result.modifiedCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const result = await deleteDatasetMapping(id);
    return NextResponse.json({ success: !!result.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}