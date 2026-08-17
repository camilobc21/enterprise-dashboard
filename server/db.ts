import { eq, and, desc, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, dashboardMetrics, InsertDashboardMetric, auditLogs, InsertAuditLog, notifications, InsertNotification, documents, InsertDocument, aiConversations, InsertAIConversation, aiMessages, InsertAIMessage, aiProviderConfigs, crudRecords, InsertCRUDRecord, networkDevices, InsertNetworkDevice } from "../drizzle/schema";

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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(input: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [{ count: registeredUserCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(isNotNull(users.passwordHash));

  await db.insert(users).values({
    openId: input.openId,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    loginMethod: "email_password",
    // The first locally registered account initializes the administration area.
    role: Number(registeredUserCount) === 0 ? "admin" : "user",
    lastSignedIn: new Date(),
  });

  const user = await getUserByEmail(input.email);
  if (!user) {
    throw new Error("Failed to retrieve newly registered user");
  }

  return user;
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return false;
  }

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));

  return true;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(isNotNull(users.passwordHash))
    .orderBy(desc(users.createdAt));
}

export async function countRegisteredAdmins() {
  const db = await getDb();
  if (!db) return 0;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, "admin"), isNotNull(users.passwordHash)));

  return Number(count);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return null;
  try {
    console.log(`[Database] Updating user ${userId} role to ${role}`);
    const updateResult = await db.update(users).set({ role }).where(eq(users.id, userId));
    console.log(`[Database] Update result:`, updateResult);
    const updatedUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    console.log(`[Database] Updated user:`, updatedUser);
    return updatedUser.length > 0 ? updatedUser[0] : null;
  } catch (error) {
    console.error("[Database] Error updating user role:", error);
    throw error;
  }
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    console.log(`[Database] Deleting user ${userId}`);
    await db.delete(users).where(eq(users.id, userId));
    console.log(`[Database] User ${userId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("[Database] Error deleting user:", error);
    throw error;
  }
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
  try {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
  } catch (error) {
    console.error("[Database] Error getting user notifications:", error);
    return [];
  }
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  } catch (error) {
    console.error("[Database] Error getting unread notifications:", error);
    return [];
  }
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.insert(notifications).values(data);
  } catch (error) {
    console.error("[Database] Error creating notification:", error);
    return null;
  }
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
    return true;
  } catch (error) {
    console.error("[Database] Error marking notification as read:", error);
    return false;
  }
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

// Connected network device inventory
export async function getNetworkDevices(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(networkDevices)
    .where(eq(networkDevices.ownerId, ownerId))
    .orderBy(desc(networkDevices.lastSeen));
}

export async function updateNetworkDeviceTrust(ownerId: number, id: number, isTrusted: boolean) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(networkDevices)
    .set({ isTrusted })
    .where(and(eq(networkDevices.id, id), eq(networkDevices.ownerId, ownerId)));

  const result = await db
    .select()
    .from(networkDevices)
    .where(and(eq(networkDevices.id, id), eq(networkDevices.ownerId, ownerId)))
    .limit(1);
  return result[0] ?? null;
}

export function normalizeDetectedNetworkDevices(devices: Array<{ ipAddress: string; macAddress: string }>) {
  const uniqueDevices = new Map<string, { ipAddress: string; macAddress: string }>();

  for (const device of devices) {
    const ipAddress = device.ipAddress.trim();
    const macAddress = device.macAddress.trim().replace(/-/g, ":").toUpperCase();

    if (!ipAddress || !macAddress) continue;
    uniqueDevices.set(macAddress, { ipAddress, macAddress });
  }

  return Array.from(uniqueDevices.values());
}

export async function upsertDetectedNetworkDevices(ownerId: number, devices: Array<{ ipAddress: string; macAddress: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const uniqueDevices = normalizeDetectedNetworkDevices(devices);

  for (const device of uniqueDevices) {
    const existingDevice = await db
      .select({ id: networkDevices.id })
      .from(networkDevices)
      .where(and(eq(networkDevices.ownerId, ownerId), eq(networkDevices.macAddress, device.macAddress)))
      .limit(1);

    if (existingDevice[0]) {
      await db
        .update(networkDevices)
        .set({
          ipAddress: device.ipAddress,
          status: "online",
          source: "router_arp",
          lastSeen: now,
        })
        .where(and(eq(networkDevices.id, existingDevice[0].id), eq(networkDevices.ownerId, ownerId)));
    } else {
      await db.insert(networkDevices).values({
        ownerId,
        displayName: `Dispositivo ${device.ipAddress}`,
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        status: "online",
        source: "router_arp",
        isTrusted: false,
        lastSeen: now,
      });
    }
  }

  return uniqueDevices.length;
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
  const insertId = Number((result as unknown as Array<{ insertId?: number }>)[0]?.insertId);
  return Number.isSafeInteger(insertId) && insertId > 0
    ? getAIConversationById(insertId)
    : null;
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

export async function getAIProviderConfig() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.configKey, "global"))
    .limit(1);

  return result[0] ?? null;
}

export async function upsertAIProviderConfig(data: {
  providerName: string;
  baseUrl: string;
  model: string;
  encryptedApiKey: string;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(aiProviderConfigs)
    .values({ configKey: "global", ...data })
    .onDuplicateKeyUpdate({
      set: {
        providerName: data.providerName,
        baseUrl: data.baseUrl,
        model: data.model,
        encryptedApiKey: data.encryptedApiKey,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      },
    });

  return getAIProviderConfig();
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
