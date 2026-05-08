import { getDb, sql } from "@/lib/models";

export interface NotificationData {
  userId: string;
  type: 'upload' | 'system';
  title: string;
  message: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: {
    datasetId?: string;
    uploadId?: string;
    action?: string;
  } | null;
}

/**
 * Create a single notification for a user
 */
export async function createNotification(notificationData: NotificationData) {
  try {
    const pool = await getDb();
    
    // 1. Verify user exists
    const userCheck = await pool.request()
      .input('id', sql.NVarChar, notificationData.userId)
      .query('SELECT id FROM [dbo].[User] WHERE id = @id');

    if (userCheck.recordset.length === 0) {
      throw new Error("User not found");
    }

    // 2. Create notification
    const id = crypto.randomUUID();
    const metadataStr = notificationData.metadata ? JSON.stringify(notificationData.metadata) : null;

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('userId', sql.NVarChar, notificationData.userId)
      .input('type', sql.NVarChar, notificationData.type)
      .input('title', sql.NVarChar, notificationData.title)
      .input('message', sql.NVarChar, notificationData.message)
      .input('priority', sql.NVarChar, notificationData.priority || 'medium')
      .input('metadata', sql.NVarChar, metadataStr)
      .input('now', sql.DateTime, new Date())
      .query(`
        INSERT INTO [dbo].[Notification] (id, userId, [type], title, [message], [read], priority, metadata, timestamp)
        VALUES (@id, @userId, @type, @title, @message, 0, @priority, @metadata, @now)
      `);

    return id;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(userIds: string[], notificationData: Omit<NotificationData, 'userId'>) {
  try {
    const pool = await getDb();
    
    // 1. Verify users exist and get valid IDs
    const request = pool.request();
    const idParams = userIds.map((id, index) => {
      const pName = `uid${index}`;
      request.input(pName, sql.NVarChar, id);
      return `@${pName}`;
    }).join(',');

    const usersResult = await request.query(`SELECT id FROM [dbo].[User] WHERE id IN (${idParams})`);
    const validUserIds = usersResult.recordset.map(u => u.id);

    if (validUserIds.length === 0) {
      throw new Error("No valid users found");
    }

    // 2. Multi-row INSERT
    // Note: For massive batches (>1000), use sql.Table or Bulk Load. 
    // For standard notifications, a dynamic query works well.
    const insertRequest = pool.request();
    const metadataStr = notificationData.metadata ? JSON.stringify(notificationData.metadata) : null;
    const now = new Date();

    const valueStrings = validUserIds.map((userId, i) => {
      const uParam = `u${i}`;
      const idParam = `id${i}`;
      insertRequest.input(uParam, sql.NVarChar, userId);
      insertRequest.input(idParam, sql.NVarChar, crypto.randomUUID());
      return `(@${idParam}, @${uParam}, @type, @title, @msg, 0, @priority, @meta, @now)`;
    }).join(',');

    insertRequest
      .input('type', sql.NVarChar, notificationData.type)
      .input('title', sql.NVarChar, notificationData.title)
      .input('msg', sql.NVarChar, notificationData.message)
      .input('priority', sql.NVarChar, notificationData.priority || 'medium')
      .input('meta', sql.NVarChar, metadataStr)
      .input('now', sql.DateTime, now);

    const result = await insertRequest.query(`
      INSERT INTO [dbo].[Notification] (id, userId, [type], title, [message], [read], priority, metadata, timestamp)
      VALUES ${valueStrings}
    `);

    return { count: result.rowsAffected[0] };
  } catch (error) {
    console.error("Failed to create notifications for users:", error);
    throw error;
  }
}

/**
 * Helper: Create upload completion notification (admin only)
 */
export async function createUploadNotification(uploadId: string, datasetName: string, adminUserId: string) {
  return createNotification({
    userId: adminUserId,
    type: 'upload',
    title: 'Dataset Upload Complete',
    message: `Dataset "${datasetName}" has been successfully uploaded and processed.`,
    priority: 'high',
    metadata: { uploadId, action: 'upload-complete' }
  });
}

/**
 * Helper: Create dataset assignment notification
 */
export async function createDatasetAssignmentNotification(userId: string, datasetName: string) {
  return createNotification({
    userId,
    type: 'system',
    title: 'New Dataset Assignment',
    message: `You have been granted access to dataset "${datasetName}"`,
    priority: 'medium',
    metadata: { action: 'dataset-assigned' }
  });
}

/**
 * Helper: Create access level update notification
 */
export async function createAccessLevelNotification(userId: string, newAccessLevel: string) {
  return createNotification({
    userId,
    type: 'system',
    title: 'Access Level Updated',
    message: `Your account access level has been updated to "${newAccessLevel}".`,
    priority: 'low',
    metadata: { action: 'access-level-changed' }
  });
}