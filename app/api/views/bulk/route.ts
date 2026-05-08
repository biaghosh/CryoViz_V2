import { NextRequest, NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, datasetId } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !datasetId) {
      return NextResponse.json({ error: "ids and datasetId are required" }, { status: 400 });
    }

    const pool = await getDb();
    const request = pool.request();
    
    // 1. Add Dataset ID parameter
    request.input('dsId', sql.NVarChar, datasetId);

    // 2. Dynamically build the 'IN' clause with parameterized IDs
    // This prevents SQL injection while allowing bulk deletion
    const idParams = ids.map((id, index) => {
      const paramName = `id${index}`;
      request.input(paramName, sql.NVarChar, id);
      return `@${paramName}`;
    }).join(', ');

    const query = `
      DELETE FROM [dbo].[View] 
      WHERE datasetId = @dsId AND id IN (${idParams})
    `;

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ error: "No views found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Views deleted successfully", deletedCount: result.rowsAffected[0] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting views:", error);
    return NextResponse.json({ error: error.message || "Failed to delete views" }, { status: 500 });
  }
}