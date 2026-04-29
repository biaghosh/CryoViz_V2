import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, datasetId } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !datasetId) {
      return NextResponse.json({ error: "ids and datasetId are required" }, { status: 400 });
    }

    const result = await prisma.view.deleteMany({
      where: {
        id: { in: ids },
        datasetId: datasetId
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "No views found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Views deleted successfully", deletedCount: result.count },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting views:", error);
    return NextResponse.json({ error: "Failed to delete views" }, { status: 500 });
  }
}