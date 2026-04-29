import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — list all studies (optionally filter by institutionId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");

    const where = institutionId ? { institutionId } : {};

    const studies = await prisma.study.findMany({
      where,
      include: { institution: { select: { id: true, name: true, abbr: true } } },
      orderBy: { createdAt: "desc" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeStudies = studies.map((s: any) => ({
      _id: s.id,
      ...s,
    }));

    return NextResponse.json({ studies: safeStudies });
  } catch (error) {
    console.error("GET /api/studies error:", error);
    return NextResponse.json({ error: "Failed to fetch studies" }, { status: 500 });
  }
}

// POST — create a new study
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, poNo, status, institutionId } = body;

    if (!name || !institutionId) {
      return NextResponse.json({ error: "name and institutionId are required" }, { status: 400 });
    }

    // Validate institution exists
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    const study = await prisma.study.create({
      data: {
        name,
        poNo: poNo || null,
        status: status || "ongoing",
        institutionId,
      },
      include: { institution: { select: { id: true, name: true, abbr: true } } },
    });

    return NextResponse.json({ success: true, study: { _id: study.id, ...study } });
  } catch (error) {
    console.error("POST /api/studies error:", error);
    return NextResponse.json({ error: "Failed to create study" }, { status: 500 });
  }
}

// PUT — update a study
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, poNo, status, institutionId } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.study.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (poNo !== undefined) data.poNo = poNo;
    if (status !== undefined) data.status = status;
    if (institutionId !== undefined) data.institutionId = institutionId;

    const updated = await prisma.study.update({
      where: { id },
      data,
      include: { institution: { select: { id: true, name: true, abbr: true } } },
    });

    return NextResponse.json({ success: true, study: { _id: updated.id, ...updated } });
  } catch (error) {
    console.error("PUT /api/studies error:", error);
    return NextResponse.json({ error: "Failed to update study" }, { status: 500 });
  }
}

// DELETE — delete a study
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Check if study has datasets
    const datasetsCount = await prisma.dataset.count({ where: { studyId: id } });
    if (datasetsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete study: ${datasetsCount} dataset(s) are still mapped to it` },
        { status: 400 }
      );
    }

    await prisma.study.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/studies error:", error);
    return NextResponse.json({ error: "Failed to delete study" }, { status: 500 });
  }
}
