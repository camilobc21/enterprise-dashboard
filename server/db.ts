import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, dashboardMetrics, InsertDashboardMetric, auditLogs, InsertAuditLog, notifications, InsertNotification, documents, InsertDocument, aiConversations, InsertAIConversation, aiMessages, InsertAIMessage, crudRecords, InsertCRUDRecord } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return false;
  await db.update(users).set({ role }).where(eq(users.id, userId));
  return true;
}

// Dashboard Metrics
export async function createDashboardMetric(data: InsertDashboardMetric) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(dashboardMetrics).values(data);
  return result;
}

export async function getUserDashboardMetrics(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dashboardMetrics).where(eq(dashboardMetrics.userId, userId));
}

export async function updateDashboardMetric(id: number, data: Partial<InsertDashboardMetric>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(dashboardMetrics).set(data).where(eq(dashboardMetrics.id, id));
  return true;
}

// Audit Logs
export async function getAuditLogs(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
}

export async function getUserAuditLogs(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(auditLogs).values(data);
}

// Notifications
export async function getUserNotifications(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId) && eq(notifications.isRead, false));
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(notifications).values(data);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
  return true;
}

// Documents
export async function getUserDocuments(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt)).limit(limit).offset(offset);
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(documents).values(data);
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(documents).where(eq(documents.id, id));
  return true;
}

// AI Conversations
export async function getUserAIConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiConversations).where(eq(aiConversations.userId, userId)).orderBy(desc(aiConversations.updatedAt));
}

export async function getAIConversationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(aiConversations).where(eq(aiConversations.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createAIConversation(data: InsertAIConversation) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aiConversations).values(data);
  return result;
}

export async function updateAIConversation(id: number, data: Partial<InsertAIConversation>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(aiConversations).set(data).where(eq(aiConversations.id, id));
  return true;
}

// AI Messages
export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(aiMessages.createdAt);
}

export async function createAIMessage(data: InsertAIMessage) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(aiMessages).values(data);
}

// CRUD Records
export async function getUserCRUDRecords(userId: number, recordType?: string, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(crudRecords).where(eq(crudRecords.userId, userId));
  if (recordType) {
    query = db.select().from(crudRecords).where(eq(crudRecords.userId, userId) && eq(crudRecords.recordType, recordType));
  }
  return query.orderBy(desc(crudRecords.createdAt)).limit(limit).offset(offset);
}

export async function getCRUDRecordById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(crudRecords).where(eq(crudRecords.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createCRUDRecord(data: InsertCRUDRecord) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(crudRecords).values(data);
}

export async function updateCRUDRecord(id: number, data: Partial<InsertCRUDRecord>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(crudRecords).set(data).where(eq(crudRecords.id, id));
  return true;
}

export async function deleteCRUDRecord(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(crudRecords).where(eq(crudRecords.id, id));
  return true;
}
