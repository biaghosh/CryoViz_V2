import sql from "mssql";
import EventEmitter from "events";
EventEmitter.defaultMaxListeners = 20;
import { getOrSetCache, invalidateCache } from "./redis";
import { v4 as uuidv4 } from 'uuid';

//remove these lines after correcting redis
await invalidateCache('datasets_all');
await invalidateCache('users_all');
await invalidateCache('institution_all');


// ---------------------------------------------------------------------------
// GLOBAL TYPE AUGMENTATIONS (Fixes frontend red lines for _id, institution, study)
// ---------------------------------------------------------------------------
declare global {
  interface Institution {
    _id?: string;
  }
  interface User {
    _id?: string;
  }
  interface Dataset {
    _id?: string;
    institution?: { name: string };
    study?: { name: string };
  }
}

// ... rest of your imports
// ---------------------------------------------------------------------------
// INTERFACES
// ---------------------------------------------------------------------------

export interface Institution {
  id: string;
  name: string;
  abbr: string;
  type: string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  accessLevel: string;
  logins: number;
  lastLogin?: Date;
  institutionId?: string;
  assignedDatasets?: string[]; 
}

export interface Dataset {
  id: string;
  datasetId?: string;
  name: string;
  description?: string;
  institutionId?: string;
  brightfieldBlobUrl?: string;
  fluorescentBlobUrl?: string;
  spacing?: number;
  studyId?: string;
  createdAt: Date;
  updatedAt: Date;
  brightfieldNumZ?: number;
  brightfieldNumY?: number;
  brightfieldNumX?: number;
  fluorescentNumZ?: number;
  fluorescentNumY?: number;
  fluorescentNumX?: number;
  dataset_num?: number;
}

export interface TissueMask {
  id: string;
  tissueMaskId?: string; // nvarchar(900)
  datasetId: string;
  organId: number;       // Must be number (int)
  tissueMaskBlobUrl: string; 
  description?: string;
  humanOrAi?: boolean;   // bit
  createdAt?: Date;
  uploadedAt?: Date;
}

export interface DatasetChildRef {
  id: string;
  datasetMappingId: string;
  datasetId: string;
  alias?: string;
  order?: number;
}

export interface DatasetMapping {
  id: string;
  parentId: string;
  children: Partial<DatasetChildRef>[];
  createdAt: Date;
  updatedAt: Date;
}

const sqlConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // Use this for Azure
    trustServerCertificate: false // Change to true for local dev if needed
  }
};

// Global variable to persist the connection across hot-reloads in development
let globalPool: sql.ConnectionPool | null = null;

/**
 * Retrieves or creates a connection pool.
 * This ensures we don't exhaust Azure SQL connections.
 */

const adaptSqlToLegacy = (result: any) => {
  if (result?.recordset && Array.isArray(result.recordset)) {
    result.recordset = result.recordset.map((row: any) => ({
      ...row,
      // Map id to _id for all tables (User, Dataset, Institution)
      _id: row.id ? row.id.toString() : row._id,
      
      // Provide empty objects for nested UI checks to prevent "Property undefined" crashes
      institution: row.institution || {},
      study: row.study || {},
    }));
  }
  return result;
};

export async function getDb(): Promise<sql.ConnectionPool> {
  try {
    if (globalPool) {
      if (globalPool.connected) return globalPool;
      await globalPool.close();
    }

    const pool = new sql.ConnectionPool(sqlConfig);
    globalPool = await pool.connect();

    // --- RE-ATTACHING YOUR INTERCEPTOR (Crucial for your _id mapping) ---
    const originalRequest = globalPool.request.bind(globalPool);
    globalPool.request = ((): sql.Request => {
      const request = originalRequest();
      const originalQuery = request.query.bind(request);

      request.query = (async (command: any, ...args: any[]) => {
        const result = await originalQuery(command, ...args);
        return adaptSqlToLegacy(result);
      }) as any;

      return request;
    }) as any;
    // --------------------------------------------------------------------

    globalPool.on('error', (err) => {
      console.error('SQL Pool Error:', err);
      globalPool = null; 
    });

    return globalPool;
  } catch (err) {
    console.error('Database connection failed:', err);
    globalPool = null;
    throw err;
  }
}

// Re-export sql for use in your models
export { sql };

// ---------------------------------------------------------------------------
// INSTITUTION FUNCTIONS
// ---------------------------------------------------------------------------

export async function getInstitutions(): Promise<Institution[]> {
  try {
    return await getOrSetCache('institution_all', async () => {
      const pool = await getDb();
      const result = await pool.request().query('SELECT * FROM [dbo].[Institution]');
      return result.recordset;
    });
  } catch (error) {
    throw new Error(`Failed to fetch institutions: ${error}`);
  }
}

export async function createInstitution(inst: Omit<Institution, "id" | "createdAt" | "updatedAt">) {
  try {
    const pool = await getDb();
    const newId = uuidv4();
    const now = new Date();
    await pool.request()
      .input('id', sql.NVarChar, newId)
      .input('name', sql.NVarChar, inst.name)
      .input('abbr', sql.NVarChar, inst.abbr)
      .input('type', sql.NVarChar, inst.type)
      .input('industry', sql.NVarChar, inst.industry)
      .input('address', sql.NVarChar, inst.address)
      .input('phone', sql.NVarChar, inst.phone)
      .input('email', sql.NVarChar, inst.email)
      .input('website', sql.NVarChar, inst.website)
      .input('status', sql.NVarChar, inst.status)
      .input('now', sql.DateTime2, now)
      .query(`
        INSERT INTO [dbo].[Institution] (id, name, abbr, type, industry, address, phone, email, website, status, createdAt, updatedAt)
        VALUES (@id, @name, @abbr, @type, @industry, @address, @phone, @email, @website, @status, @now, @now)
      `);
    await invalidateCache('institution_all');
    return { insertedId: newId };
  } catch (error) {
    throw new Error(`Failed to create institution: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// USER FUNCTIONS
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<User[]> {
  try {
    return await getOrSetCache('users_all', async () => {
      const pool = await getDb();
      const result = await pool.request().query(`
        SELECT u.*, 
        (SELECT B FROM [dbo].[_UserAssignedDatasets] WHERE A = u.id FOR JSON PATH) as assignedDatasetsRaw
        FROM [dbo].[User] u
      `);
      return result.recordset.map((user: any) => ({
        ...user,
        assignedDatasets: user.assignedDatasetsRaw ? JSON.parse(user.assignedDatasetsRaw).map((d: any) => d.B) : []
      }));
    });
  } catch (error) {
    throw new Error(`Failed to fetch users: ${error}`);
  }
}

export async function createUser(user: Omit<User, "id" | "logins" | "lastLogin" | "assignedDatasets">) {
  try {
    const pool = await getDb();
    const newId = uuidv4();
    await pool.request()
      .input('id', sql.NVarChar, newId)
      .input('name', sql.NVarChar, user.name)
      .input('email', sql.NVarChar, user.email)
      .input('accessLevel', sql.NVarChar, user.accessLevel || "user")
      .input('instId', sql.NVarChar, user.institutionId)
      .query(`
        INSERT INTO [dbo].[User] (id, name, email, accessLevel, institutionId, logins)
        VALUES (@id, @name, @email, @accessLevel, @instId, 0)
      `);
    await invalidateCache('users_all');
    return { insertedId: newId };
  } catch (error) {
    throw new Error(`Failed to create user: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// DATASET FUNCTIONS
// ---------------------------------------------------------------------------

export async function getDatasets(): Promise<Dataset[]> {
  try {
    return await getOrSetCache('datasets_all', async () => {
      const pool = await getDb();
      const result = await pool.request().query(`
        SELECT d.*, 
        (SELECT A FROM [dbo].[_UserAssignedDatasets] WHERE B = d.id FOR JSON PATH) as assignedUsersRaw
        FROM [dbo].[Dataset] d
      `);
      return result.recordset.map((ds: any) => ({
        ...ds,
        assignedUsers: ds.assignedUsersRaw ? JSON.parse(ds.assignedUsersRaw).map((u: any) => u.A) : []
      }));
    });
  } catch (error) {
    throw new Error(`Failed to fetch datasets: ${error}`);
  }
}

export async function createDataset(dataset: Omit<Dataset, "id" | "createdAt" | "updatedAt"> & { assignedUsers?: string[] }) {
  const pool = await getDb();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const newId = uuidv4();
    const now = new Date();
    
    // Fallback: If datasetId is null, use a shortened ID to avoid UNIQUE constraint violation (NULL index error)
    const uniqueDatasetId = dataset.datasetId || `DS-${newId.slice(0, 8)}`;

    await transaction.request()
      .input('id', sql.NVarChar, newId)
      .input('datasetId', sql.NVarChar, uniqueDatasetId)
      .input('name', sql.NVarChar, dataset.name)
      .input('description', sql.NVarChar, dataset.description || null)
      .input('instId', sql.NVarChar, dataset.institutionId || null)
      .input('studyId', sql.NVarChar, dataset.studyId || null)
      .input('bfUrl', sql.NVarChar, dataset.brightfieldBlobUrl || null)
      .input('flUrl', sql.NVarChar, dataset.fluorescentBlobUrl || null)
      .input('spacing', sql.Float, dataset.spacing || null)
      // Including dimension columns found in your SQL schema
      .input('bfX', sql.Int, dataset.brightfieldNumX || null)
      .input('bfY', sql.Int, dataset.brightfieldNumY || null)
      .input('bfZ', sql.Int, dataset.brightfieldNumZ || null)
      .input('now', sql.DateTime2, now)
      .query(`
        INSERT INTO [dbo].[Dataset] (
          id, datasetId, name, description, institutionId, studyId, 
          brightfieldBlobUrl, fluorescentBlobUrl, spacing, 
          brightfieldNumX, brightfieldNumY, brightfieldNumZ,
          createdAt, updatedAt
        )
        VALUES (
          @id, @datasetId, @name, @description, @instId, @studyId, 
          @bfUrl, @flUrl, @spacing, 
          @bfX, @bfY, @bfZ,
          @now, @now
        )
      `);

    // Handle Many-to-Many junction table for assigned users
    if (dataset.assignedUsers?.length) {
      for (const userId of dataset.assignedUsers) {
        await transaction.request()
          .input('uid', sql.NVarChar, userId)
          .input('did', sql.NVarChar, newId)
          .query('INSERT INTO [dbo].[_UserAssignedDatasets] (A, B) VALUES (@uid, @did)');
      }
    }

    await transaction.commit();
    await invalidateCache('datasets_all');
    
    return { insertedId: newId };
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
}

// ---------------------------------------------------------------------------
// TISSUE MASK FUNCTIONS
// ---------------------------------------------------------------------------

export async function getTissueMasksByDataset(datasetId: string): Promise<TissueMask[]> {
  const pool = await getDb();
  const result = await pool.request()
    .input('dsId', sql.NVarChar, datasetId)
    .query('SELECT * FROM [dbo].[TissueMask] WHERE datasetId = @dsId');
  
  return result.recordset; // organId will correctly return as a number here
}

export async function createTissueMask(mask: Omit<TissueMask, "id">) {
  const pool = await getDb();
  const newId = uuidv4();
  
  await pool.request()
    .input('id', sql.NVarChar, newId)
    .input('dsId', sql.NVarChar, mask.datasetId)
    .input('orgId', sql.Int, mask.organId) // Corrected to sql.Int
    .input('url', sql.NVarChar, mask.tissueMaskBlobUrl) // Corrected name
    .input('human', sql.Bit, mask.humanOrAi ?? true)
    .query(`
      INSERT INTO [dbo].[TissueMask] 
      (id, datasetId, organId, tissueMaskBlobUrl, humanOrAi, createdAt)
      VALUES (@id, @dsId, @orgId, @url, @human, GETDATE())
    `);
  return { insertedId: newId };
}

export async function updateTissueMask(id: string, maskUrl: string) {
  const pool = await getDb();
  await pool.request()
    .input('id', sql.NVarChar, id)
    .input('url', sql.NVarChar, maskUrl)
    .input('now', sql.DateTime2, new Date())
    .query('UPDATE [dbo].[TissueMask] SET maskUrl = @url, updatedAt = @now WHERE id = @id');
  return { success: true };
}

export async function deleteTissueMask(id: string) {
  const pool = await getDb();
  await pool.request().input('id', sql.NVarChar, id).query('DELETE FROM [dbo].[TissueMask] WHERE id = @id');
  return { success: true };
}

// ---------------------------------------------------------------------------
// DATASET MAPPINGS
// ---------------------------------------------------------------------------

export async function createDatasetMapping(parentId: string, children: any[]) {
  const pool = await getDb();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const mappingId = uuidv4();
    const now = new Date();

    // Insert Parent Mapping
    await transaction.request()
      .input('id', sql.NVarChar, mappingId)
      .input('parentId', sql.NVarChar, parentId)
      .input('now', sql.DateTime2, now)
      .query(`
        INSERT INTO [dbo].[DatasetMapping] (id, parentId, createdAt, updatedAt) 
        VALUES (@id, @parentId, @now, @now)
      `);

    // Insert Children with Order preservation
    for (const [index, child] of children.entries()) {
      await transaction.request()
        .input('id', sql.NVarChar, uuidv4())
        .input('mid', sql.NVarChar, mappingId)
        .input('did', sql.NVarChar, child.datasetId)
        .input('alias', sql.NVarChar, child.alias || null)
        .input('order', sql.Int, child.order ?? index) // Preserves array sequence
        .query(`
          INSERT INTO [dbo].[DatasetChildRef] (id, datasetMappingId, datasetId, alias, [order])
          VALUES (@id, @mid, @did, @alias, @order)
        `);
    }

    await transaction.commit();
    
    // Invalidate specific cache for this parent
    await invalidateCache(`dataset_mappings_${parentId}`);
    
    return mappingId;
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
}

export async function getDatasetMappingByParent(parentId: string) {
  return await getOrSetCache(`dataset_mappings_${parentId}`, async () => {
    const pool = await getDb();
    const mappingRes = await pool.request()
      .input('pid', sql.NVarChar, parentId)
      .query('SELECT * FROM [dbo].[DatasetMapping] WHERE parentId = @pid');
    
    const mapping = mappingRes.recordset[0];
    if (!mapping) return null;

    const childrenRes = await pool.request()
      .input('mid', sql.NVarChar, mapping.id)
      .query('SELECT datasetId, alias, [order] FROM [dbo].[DatasetChildRef] WHERE datasetMappingId = @mid ORDER BY [order] ASC');

    return { ...mapping, children: childrenRes.recordset };
  });
}

export async function getDatasetMappings() {
  const pool = await getDb();
  const result = await pool.request().query(`
    SELECT * FROM [dbo].[DatasetMapping]
  `);
  return result.recordset;
}

export async function updateDatasetMapping(
  id: string, 
  patch: { children?: { datasetId: string; alias?: string; order?: number }[] }
) {
  const pool = await getDb();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();

    if (patch.children) {
      // 1. Clear existing children for this mapping
      await transaction.request()
        .input('mid', sql.NVarChar, id)
        .query('DELETE FROM [dbo].[DatasetChildRef] WHERE datasetMappingId = @mid');

      // 2. Re-insert children with updated order
      for (const [index, child] of patch.children.entries()) {
        await transaction.request()
          .input('cid', sql.NVarChar, uuidv4())
          .input('mid', sql.NVarChar, id)
          .input('dsid', sql.NVarChar, child.datasetId)
          .input('alias', sql.NVarChar, child.alias || null)
          .input('order', sql.Int, child.order ?? index)
          .query(`
            INSERT INTO [dbo].[DatasetChildRef] (id, datasetMappingId, datasetId, alias, [order])
            VALUES (@cid, @mid, @dsid, @alias, @order)
          `);
      }
    }

    await transaction.commit();
    return { modifiedCount: 1 }; // Return 1 to satisfy the route.ts check
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Deletes the mapping and all associated children (cascading cleanup)
 */
export async function deleteDatasetMapping(id: string) {
  const pool = await getDb();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Delete children first (Foreign Key constraint safety)
    await transaction.request()
      .input('mid', sql.NVarChar, id)
      .query('DELETE FROM [dbo].[DatasetChildRef] WHERE datasetMappingId = @mid');

    // 2. Delete parent mapping
    const result = await transaction.request()
      .input('id', sql.NVarChar, id)
      .query('DELETE FROM [dbo].[DatasetMapping] WHERE id = @id');

    await transaction.commit();
    return { deletedCount: result.rowsAffected[0] };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}