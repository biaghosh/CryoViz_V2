import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env.local');
  }

  console.log('Connecting to MongoDB...');
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db();
  console.log('Connected to MongoDB.');

  console.log('Connecting to Azure SQL Server (Prisma)...');
  await prisma.$connect();
  console.log('Connected to Azure SQL.');

  // 1. Institutions
  console.log('--- Migrating Institutions ---');
  const institutions = await db.collection('institutions').find({}).toArray();
  let instCount = 0;
  for (const inst of institutions) {
    await prisma.institution.upsert({
      where: { id: inst._id.toString() },
      update: {},
      create: {
        id: inst._id.toString(),
        name: inst.name || 'Unknown',
        abbr: inst.abbr || 'UNK',
        type: inst.type || 'Others',
        industry: inst.industry || '',
        address: inst.address || '',
        phone: inst.phone || '',
        email: inst.email || '',
        website: inst.website || '',
        status: inst.status || 'Active',
        createdAt: inst.createdAt || new Date(),
        updatedAt: inst.updatedAt || new Date(),
      }
    });
    instCount++;
  }
  console.log(`Migrated ${instCount} institutions.`);

  // 2. Users (Without assigned datasets to avoid referring to datasets before they exist)
  console.log('--- Migrating Users ---');
  const users = await db.collection('users').find({}).toArray();
  let userCount = 0;
  for (const user of users) {
    if (!user.email) continue; // Skip bad records
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user._id.toString(),
        name: user.name || null,
        email: user.email,
        accessLevel: user.accessLevel || 'user',
        logins: user.logins || 0,
        lastLogin: user.lastLogin || null,
        institutionId: user.institutionId ? user.institutionId.toString() : null,
        createdAt: user.createdAt || new Date(),
      }
    });
    userCount++;
  }
  console.log(`Migrated ${userCount} users.`);

  // 3. Datasets
  console.log('--- Migrating Datasets ---');
  const datasets = await db.collection('datasets').find({}).toArray();
  let dsCount = 0;
  for (const ds of datasets) {
    // If institutionId is missing, assign to a safe fallback
    const instId = ds.institutionId?.toString();
    const instExists = instId ? await prisma.institution.findUnique({ where: { id: instId } }) : false;

    await prisma.dataset.upsert({
      where: { id: ds._id.toString() },
      update: {},
      create: {
        id: ds._id.toString(),
        datasetId: ds.datasetId || null,
        name: ds.name || 'Unknown',
        description: ds.description || null,
        institutionId: instExists ? instId : institutions[0]?._id.toString() || '',
        brightfieldBlobUrl: ds.brightfieldBlobUrl || null,
        fluorescentBlobUrl: ds.fluorescentBlobUrl || null,
        spacing: ds.spacing || null,
        brightfieldNumZ: ds.brightfieldNumZ || null,
        brightfieldNumY: ds.brightfieldNumY || null,
        brightfieldNumX: ds.brightfieldNumX || null,
        fluorescentNumZ: ds.fluorescentNumZ || null,
        fluorescentNumY: ds.fluorescentNumY || null,
        fluorescentNumX: ds.fluorescentNumX || null,
        createdAt: ds.createdAt || new Date(),
        updatedAt: ds.updatedAt || new Date(),
      }
    });
    dsCount++;
  }
  console.log(`Migrated ${dsCount} datasets.`);

  // 4. User -> Assigned Datasets
  console.log('--- Linking Assigned Datasets to Users ---');
  for (const user of users) {
    if (!user.email || !user.assignedDatasets || !Array.isArray(user.assignedDatasets)) continue;
    const existingDatasetIds = await prisma.dataset.findMany({
      where: { id: { in: user.assignedDatasets.map((id: any) => id.toString()) } },
      select: { id: true }
    });

    if (existingDatasetIds.length > 0) {
      await prisma.user.update({
        where: { email: user.email },
        data: {
          assignedDatasets: {
            connect: existingDatasetIds
          }
        }
      });
    }
  }

  // 5. Dataset Mappings
  console.log('--- Migrating Dataset Mappings ---');
  const mappings = await db.collection('dataset_mappings').find({}).toArray();
  let mapCount = 0;
  for (const m of mappings) {
    const parentId = m.parentId.toString();
    const parentExists = await prisma.dataset.findUnique({ where: { id: parentId }});
    if (!parentExists) continue;

    const validChildren = [];
    for (const c of m.children || []) {
      const childExists = await prisma.dataset.findUnique({ where: { id: c.datasetId.toString() }});
      if (childExists) {
        validChildren.push({
          datasetId: c.datasetId.toString(),
          alias: c.alias || null,
          order: c.order || 0
        });
      }
    }

    await prisma.datasetMapping.upsert({
      where: { parentId: parentId },
      update: {},
      create: {
        id: m._id.toString(),
        parentId: parentId,
        createdAt: m.createdAt || new Date(),
        updatedAt: m.updatedAt || new Date(),
        children: {
          create: validChildren
        }
      }
    });
    mapCount++;
  }
  console.log(`Migrated ${mapCount} mappings.`);

  // 6. Studies
  console.log('--- Migrating Studies (Skipped - Schema changed) ---');
  // const studies = await db.collection('studies').find({}).toArray();
  // let studyCount = 0;
  // for (const s of studies) {
  //   const dExists = await prisma.dataset.findUnique({ where: { id: s.datasetId.toString() }});
  //   const uExists = await prisma.user.findUnique({ where: { email: s.user }});
  //   if (!dExists || !uExists || !s.name) continue;

  //   await prisma.study.upsert({
  //     where: {
  //       name_datasetId_userEmail: {
  //         name: s.name,
  //         datasetId: s.datasetId.toString(),
  //         userEmail: s.user
  //       }
  //     },
  //     update: {},
  //     create: {
  //       id: s._id.toString(),
  //       name: s.name,
  //       description: s.description || null,
  //       userEmail: s.user,
  //       datasetId: s.datasetId.toString(),
  //       createdAt: s.createdAt || new Date(),
  //       updatedAt: s.updatedAt || new Date(),
  //     }
  //   });
  //   studyCount++;
  // }
  // console.log(`Migrated ${studyCount} studies.`);

  // 7. Annotations
  console.log('--- Migrating Annotations ---');
  const annotations = await db.collection('annotations').find({}).toArray();
  let annCount = 0;
  for (const a of annotations) {
    const annId = a.id || a._id.toString();
    const dExists = await prisma.dataset.findUnique({ where: { id: a.datasetId?.toString() }});
    const uExists = await prisma.user.findUnique({ where: { email: a.user }});
    
    if (!dExists || !uExists || !a.text) continue;

    await prisma.annotation.upsert({
      where: { annotationId: annId },
      update: {},
      create: {
        annotationId: annId,
        view: a.view || 'unknown',
        slice: a.slice || 0,
        x: a.x || 0,
        y: a.y || 0,
        text: a.text,
        instance: a.instance || 0,
        userEmail: a.user,
        status: a.status || 'active',
        groupName: a.studyName || 'Default Group',
        datasetId: a.datasetId.toString(),
        datetime: a.datetime || Date.now(),
      }
    });
    annCount++;
  }
  console.log(`Migrated ${annCount} annotations.`);

  // 8. Views
  console.log('--- Migrating Views ---');
  const views = await db.collection('views').find({}).toArray();
  let viewCount = 0;
  for (const v of views) {
    const dExists = await prisma.dataset.findUnique({ where: { id: v.datasetId?.toString() }});
    const uExists = await prisma.user.findUnique({ where: { email: v.creator || v.user }});
    if (!dExists || !uExists) continue;

    await prisma.view.upsert({
      where: { id: v._id.toString() },
      update: {},
      create: {
        id: v._id.toString(),
        name: v.name || 'Untitled View',
        coords: v.coords ? JSON.stringify(v.coords) : '[]',
        zoom: v.zoom || 0,
        pan: v.pan ? JSON.stringify(v.pan) : '{}',
        creatorEmail: v.creator || v.user,
        datasetId: v.datasetId.toString(),
        loadCount: v.loadCount || 0,
        loadStats: v.loadStats ? JSON.stringify(v.loadStats) : '[]',
        createdAt: v.createdAt || new Date(),
      }
    });
    viewCount++;
  }
  console.log(`Migrated ${viewCount} views.`);

  // 9. Feedback
  console.log('--- Migrating Feedback ---');
  const feedbacks = await db.collection('feedback').find({}).toArray();
  let fbCount = 0;
  for (const f of feedbacks) {
    const email = f.userEmail || f.user;
    const uExists = email ? await prisma.user.findUnique({ where: { email: email }}) : null;
    if (!uExists) continue;

    await prisma.feedback.upsert({
      where: { id: f._id.toString() },
      update: {},
      create: {
        id: f._id.toString(),
        userId: uExists.id,
        userEmail: email,
        userName: f.userName || email,
        type: f.type || 'general',
        category: f.category || 'other',
        priority: f.priority || 'medium',
        title: f.title || 'Migration',
        description: f.description || '',
        rating: f.rating || null,
        status: f.status || 'pending',
        adminResponse: f.adminResponse || null,
        adminResponseAt: f.adminResponseAt || null,
        createdAt: f.createdAt || new Date(),
        updatedAt: f.updatedAt || new Date(),
      }
    });
    fbCount++;
  }
  console.log(`Migrated ${fbCount} feedback records.`);

  // 10. Upload Status
  console.log('--- Migrating Upload Status ---');
  const uploads = await db.collection('upload_status').find({}).toArray();
  let upCount = 0;
  for (const u of uploads) {
    if (!u.uploadId || !u.userId) continue;

    await prisma.uploadStatus.upsert({
      where: { uploadId: u.uploadId },
      update: {},
      create: {
        id: u._id.toString(),
        uploadId: u.uploadId,
        userId: u.userId, // email
        status: u.status || 'pending',
        progress: u.progress || 0,
        message: u.message || '',
        datasetName: u.datasetName || 'Unknown',
        startedAt: u.startedAt || new Date(),
        completedAt: u.completedAt || null,
        result: u.result ? JSON.stringify(u.result) : null,
        error: u.error ? JSON.stringify(u.error) : null,
      }
    });
    upCount++;
  }
  console.log(`Migrated ${upCount} upload records.`);

  // 11. Notifications
  console.log('--- Migrating Notifications ---');
  const notifications = await db.collection('notifications').find({}).toArray();
  let notifCount = 0;
  for (const n of notifications) {
    const uExists = await prisma.user.findUnique({ where: { id: n.userId?.toString() }});
    if (!uExists) continue;

    await prisma.notification.upsert({
      where: { id: n._id.toString() },
      update: {},
      create: {
        id: n._id.toString(),
        userId: n.userId.toString(),
        type: n.type || 'system',
        title: n.title || 'Notification',
        message: n.message || '',
        priority: n.priority || 'medium',
        read: n.read || false,
        metadata: n.metadata ? JSON.stringify(n.metadata) : null,
        timestamp: n.timestamp || new Date(),
      }
    });
    notifCount++;
  }
  console.log(`Migrated ${notifCount} notifications.`);

  console.log('-------------------------');
  console.log('Migration Completed Successfully!');

  await mongoClient.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
