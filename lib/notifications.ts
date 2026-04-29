import prisma from "@/lib/prisma";

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
 * Create a notification for a user
 * This function can be called from other APIs to create notifications
 */
export async function createNotification(notificationData: NotificationData) {
  try {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: notificationData.userId } });
    if (!user) {
      throw new Error("User not found");
    }

    // Create notification
    const result = await prisma.notification.create({
      data: {
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'medium',
        read: false,
        metadata: notificationData.metadata ? JSON.stringify(notificationData.metadata) : null,
      }
    });

    return result.id;
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
    // Verify users exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    if (users.length === 0) {
      throw new Error("No valid users found");
    }

    // Create notifications for each user
    const result = await prisma.notification.createMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: users.map((user: any) => ({
        userId: user.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'medium',
        read: false,
        metadata: notificationData.metadata ? JSON.stringify(notificationData.metadata) : null,
      }))
    });

    return { count: result.count };
  } catch (error) {
    console.error("Failed to create notifications for users:", error);
    throw error;
  }
}

/**
 * Create upload completion notification (admin only)
 */
export async function createUploadNotification(uploadId: string, datasetName: string, adminUserId: string) {
  return createNotification({
    userId: adminUserId,
    type: 'upload',
    title: 'Dataset Upload Complete',
    message: `Dataset "${datasetName}" has been successfully uploaded and processed.`,
    priority: 'high',
    metadata: {
      uploadId,
      action: 'upload-complete'
    }
  });
}

/**
 * Create dataset assignment notification
 */
export async function createDatasetAssignmentNotification(userId: string, datasetName: string) {
  return createNotification({
    userId,
    type: 'system',
    title: 'New Dataset Assignment',
    message: `You have been granted access to dataset "${datasetName}"`,
    priority: 'medium',
    metadata: {
      action: 'dataset-assigned'
    }
  });
}

/**
 * Create access level update notification
 */
export async function createAccessLevelNotification(userId: string, newAccessLevel: string) {
  return createNotification({
    userId,
    type: 'system',
    title: 'Access Level Updated',
    message: `Your account access level has been updated to "${newAccessLevel}".`,
    priority: 'low',
    metadata: {
      action: 'access-level-changed'
    }
  });
}
