import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { getDb, sql } from '../lib/models';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  console.log('🚀 Starting Migration: MongoDB -> Azure SQL Server');
  
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db();
  const pool = await getDb();

  // --- 1. Institutions ---
  console.log('--- Migrating Institutions ---');
  const institutions = await db.collection('institutions').find({}).toArray();
  for (const inst of institutions) {
    const id = inst._id.toString();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, inst.name || 'Unknown')
      .input('abbr', sql.NVarChar, inst.abbr || 'UNK')
      .input('type', sql.NVarChar, inst.type || 'Others')
      .input('status', sql.NVarChar, inst.status || 'Active')
      .input('now', sql.DateTime, new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Institution WHERE id = @id)
        INSERT INTO Institution (id, name, abbr, [type], status, createdAt, updatedAt)
        VALUES (@id, @name, @abbr, @type, @status, @now, @now)
      `);
  }

  // --- 2. Users ---
  console.log('--- Migrating Users ---');
  const users = await db.collection('users').find({}).toArray();
  for (const user of users) {
    if (!user.email) continue;
    await pool.request()
      .input('id', sql.NVarChar, user._id.toString())
      .input('name', sql.NVarChar, user.name || null)
      .input('email', sql.NVarChar, user.email)
      .input('level', sql.NVarChar, user.accessLevel || 'user')
      .input('instId', sql.NVarChar, user.institutionId?.toString() || null)
      .input('now', sql.DateTime, user.createdAt || new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM [User] WHERE email = @email)
        INSERT INTO [User] (id, name, email, accessLevel, institutionId, createdAt)
        VALUES (@id, @name, @email, @level, @instId, @now)
      `);
  }

  // --- 3. Datasets ---
  console.log('--- Migrating Datasets ---');
  const datasets = await db.collection('datasets').find({}).toArray();
  for (const ds of datasets) {
    const id = ds._id.toString();
    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, ds.name || 'Unknown')
      .input('instId', sql.NVarChar, ds.institutionId?.toString() || institutions[0]?._id.toString())
      .input('bfUrl', sql.NVarChar, ds.brightfieldBlobUrl || null)
      .input('flUrl', sql.NVarChar, ds.fluorescentBlobUrl || null)
      .input('now', sql.DateTime, ds.createdAt || new Date())
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Dataset WHERE id = @id)
        INSERT INTO Dataset (id, name, institutionId, brightfieldBlobUrl, fluorescentBlobUrl, createdAt, updatedAt)
        VALUES (@id, @name, @instId, @bfUrl, @flUrl, @now, @now)
      `);
  }

  // --- 4. Link User Datasets (Many-to-Many) ---
  console.log('--- Linking Datasets to Users ---');
  for (const user of users) {
    if (!user.assignedDatasets || !Array.isArray(user.assignedDatasets)) continue;
    for (const dsId of user.assignedDatasets) {
      await pool.request()
        .input('userId', sql.NVarChar, user._id.toString())
        .input('dsId', sql.NVarChar, dsId.toString())
        .query(`
          IF EXISTS (SELECT 1 FROM Dataset WHERE id = @dsId) 
          AND NOT EXISTS (SELECT 1 FROM _DatasetToUser WHERE A = @dsId AND B = @userId)
          INSERT INTO _DatasetToUser (A, B) VALUES (@dsId, @userId)
        `);
    }
  }

  // --- 5. Views ---
  console.log('--- Migrating Views ---');
  const views = await db.collection('views').find({}).toArray();
  for (const v of views) {
    await pool.request()
      .input('id', sql.NVarChar, v._id.toString())
      .input('name', sql.NVarChar, v.name || 'Untitled View')
      .input('coords', sql.NVarChar, JSON.stringify(v.coords || []))
      .input('pan', sql.NVarChar, JSON.stringify(v.pan || {}))
      .input('creator', sql.NVarChar, v.creator || v.user)
      .input('dsId', sql.NVarChar, v.datasetId?.toString())
      .input('now', sql.DateTime, v.createdAt || new Date())
      .query(`
        IF EXISTS (SELECT 1 FROM Dataset WHERE id = @dsId)
        AND NOT EXISTS (SELECT 1 FROM [View] WHERE id = @id)
        INSERT INTO [View] (id, name, coords, pan, creatorEmail, datasetId, createdAt)
        VALUES (@id, @name, @coords, @pan, @creator, @dsId, @now)
      `);
  }

  console.log('✅ Migration Completed Successfully!');
  await mongoClient.close();
}

main().catch(console.error);