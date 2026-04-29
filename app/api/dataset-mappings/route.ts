// app/api/dataset-mappings/route.ts
import { NextResponse, NextRequest } from "next/server";
import {
  getDatasetMappings,
  getDatasetMappingByParent,
  createDatasetMapping,
  updateDatasetMapping,
  deleteDatasetMapping,
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
  if (parentId) {
    const mapping = await getDatasetMappingByParent(parentId);
    return NextResponse.json({ mapping: mapping ? { ...mapping, _id: mapping._id?.toString() } : null });
  }
  const mappings = await getDatasetMappings();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeMappings = mappings.map((m: any) => ({ ...m, _id: m._id?.toString() }));
  return NextResponse.json({ mappings: safeMappings });
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<CreateMappingBody> = await request.json();
    const { parentId, children = [] } = body;
    if (!parentId) {
      return NextResponse.json({ error: "parentId required" }, { status: 400 });
    }

    const childIds: string[] = children.map((c) => c.datasetId);
    if (childIds.includes(parentId)) {
      return NextResponse.json({ error: "Parent cannot be a child" }, { status: 400 });
    }
    if (new Set(childIds).size !== childIds.length) {
      return NextResponse.json({ error: "Duplicate child datasetIds" }, { status: 400 });
    }

    const result = await createDatasetMapping({ parentId, children });
    return NextResponse.json({ success: true, id: result.insertedId.toString() });
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
      const childIds: string[] = children.map((c) => c.datasetId);
      if (parentId && childIds.includes(parentId)) {
        return NextResponse.json({ error: "Parent cannot be a child" }, { status: 400 });
      }
      if (new Set(childIds).size !== childIds.length) {
        return NextResponse.json({ error: "Duplicate child datasetIds" }, { status: 400 });
      }
    }

    const result = await updateDatasetMapping(id, { parentId, children });
    return NextResponse.json({ success: !!result.modifiedCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const result = await deleteDatasetMapping(id);
  return NextResponse.json({ success: !!result.deletedCount });
}