import { NextResponse, NextRequest } from "next/server";
import { 
  getDb, 
  sql, 
  getDatasetMappings, 
  getDatasetMappingByParent, 
  createDatasetMapping, 
  updateDatasetMapping, 
  deleteDatasetMapping, 
  getUsers, 
  getDatasets,
  getInstitutions // Ensure this is added to your lib/models.ts
} from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DatasetChild = { datasetId: string; alias?: string; order?: number };

interface CreateMappingBody {
  parentId: string;
  children: DatasetChild[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  const datasetId = searchParams.get("datasetId");

  // --- 1. Fetch Specific Dataset Details (SQL Native) ---
  if (datasetId) {
    try {
      const pool = await getDb();
      
      // Fetch Dataset with Study and Institution info
      const dsResult = await pool.request()
        .input('id', sql.NVarChar, datasetId)
        .query(`
          SELECT d.*, s.name as studyName, i.name as institutionName
          FROM [dbo].[Dataset] d
          LEFT JOIN [dbo].[Study] s ON d.studyId = s.id
          LEFT JOIN [dbo].[Institution] i ON s.institutionId = i.id
          WHERE d.id = @id OR d.datasetId = @id
        `);

      const dataset = dsResult.recordset[0];

      if (!dataset) {
        return NextResponse.json({ dataset: null, error: "Dataset not found" }, { status: 404 });
      }

      // Fetch associated TissueMasks (Organs)
      const maskResult = await pool.request()
        .input('did', sql.NVarChar, dataset.id)
        .query(`
          SELECT o.name, o.color, tm.tissueMaskBlobUrl as blobUrl
          FROM [dbo].[TissueMask] tm
          JOIN [dbo].[Organ] o ON tm.organId = o.id
          WHERE tm.datasetId = @did
        `);

      return NextResponse.json({ 
        dataset: {
          ...dataset,
          organs: maskResult.recordset.map((m: any) => ({ // Add : any here
            name: m.name,
            color: m.color || "#808080",
            blobUrl: m.blobUrl
          }))
        }
});
    } catch (e) {
      console.error("Admin GET Dataset Error:", e);
      return NextResponse.json({ error: "Failed to load dataset details" }, { status: 500 });
    }
  }

  // --- 2. Query for a specific Mapping ---
  if (parentId) {
    const mapping = await getDatasetMappingByParent(parentId);
    return NextResponse.json({ mapping });
  }

  // --- 3. SIDEBAR BASE DATA ---
  try {
    const [users, datasets, mappings, institutions] = await Promise.all([
      getUsers(),
      getDatasets(),
      getDatasetMappings(),
      getInstitutions() // Refactor this function in lib/models.ts to use SQL
    ]);

    return NextResponse.json({
      users: users || [],
      datasets: datasets || [],
      mappings: mappings || [],
      institutions: institutions || []
    });
  } catch (err) {
    console.error("Admin Sidebar Data Error:", err);
    return NextResponse.json({ users: [], datasets: [], mappings: [], institutions: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMappingBody = await request.json();
    const { parentId, children = [] } = body;
    
    if (!parentId) return NextResponse.json({ error: "parentId required" }, { status: 400 });
    
    const newMappingId = await createDatasetMapping(parentId, children);
    return NextResponse.json({ success: true, id: newMappingId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, children } = body; // Remove parentId here if not used
    
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    
    // Only pass what the function expects
    await updateDatasetMapping(id, { children }); 
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    
    await deleteDatasetMapping(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}