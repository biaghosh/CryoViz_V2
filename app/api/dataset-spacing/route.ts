import { NextRequest, NextResponse } from "next/server";
import { getDb, sql } from "@/lib/models";

export async function PUT(request: NextRequest) {
  try {
    const { datasetId, spacing } = await request.json();

    // 1. Validation
    if (!datasetId || typeof spacing !== 'number' || spacing <= 0) {
      return NextResponse.json(
        { error: "Invalid datasetId or spacing value" }, 
        { status: 400 }
      );
    }

    const pool = await getDb();

    // 2. Check if dataset exists
    const checkResult = await pool.request()
      .input('id', sql.NVarChar, datasetId)
      .query('SELECT id FROM [dbo].[Dataset] WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    // 3. Update spacing
    await pool.request()
      .input('id', sql.NVarChar, datasetId)
      .input('spacing', sql.Float, spacing)
      .query('UPDATE [dbo].[Dataset] SET spacing = @spacing WHERE id = @id');

    return NextResponse.json({ success: true, spacing });
  } catch (error: any) {
    console.error("Error updating dataset spacing:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    );
  }
}