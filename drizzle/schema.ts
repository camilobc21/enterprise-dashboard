import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, longtext, index, uniqueIndex } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  /** Required only for users registered locally; unique when provided. */
  email: varchar("email", { length: 320 }).unique(),
  /** Salted scrypt hash for local email/password authentication. */
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Dashboard metrics table for storing KPI and statistics data
 */
export const dashboardMetrics = mysqlTable("dashboard_metrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  metricName: varchar("metricName", { length: 255 }).notNull(),
  metricType: mysqlEnum("metricType", ["kpi", "chart", "statistic"]).notNull(),
  value: decimal("value", { precision: 18, scale: 2 }),
  label: varchar("label", { length: 255 }),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("dashboard_metrics_userId_idx").on(table.userId),
  metricNameIdx: index("dashboard_metrics_metricName_idx").on(table.metricName),
}));

export type DashboardMetric = typeof dashboardMetrics.$inferSelect;
export type InsertDashboardMetric = typeof dashboardMetrics.$inferInsert;

/**
 * Audit logs table for tracking user actions and system events
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 255 }).notNull(),
  entityId: varchar("entityId", { length: 255 }),
  changes: json("changes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["success", "failure"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("audit_logs_userId_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  createdAtIdx: index("audit_logs_createdAt_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Notifications table for system and user notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "success", "warning", "error"]).default("info").notNull(),
  actionUrl: varchar("actionUrl", { length: 2048 }),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
}, (table) => ({
  userIdIdx: index("notifications_userId_idx").on(table.userId),
  isReadIdx: index("notifications_isRead_idx").on(table.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Documents table for file storage metadata
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 2048 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  description: text("description"),
  tags: json("tags"),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("documents_userId_idx").on(table.userId),
  isPublicIdx: index("documents_isPublic_idx").on(table.isPublic),
}));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Inventory of devices detected on a network that the dashboard owner is authorized to monitor.
 * Data can be entered by an administrator or supplied by an approved router/DHCP/ARP collector.
 */
export const networkDevices = mysqlTable("network_devices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  macAddress: varchar("macAddress", { length: 32 }).notNull(),
  vendor: varchar("vendor", { length: 160 }),
  deviceType: mysqlEnum("deviceType", ["unknown", "computer", "phone", "tablet", "iot", "printer", "router", "camera", "server"]).default("unknown").notNull(),
  status: mysqlEnum("status", ["online", "offline", "unknown"]).default("unknown").notNull(),
  isTrusted: boolean("isTrusted").default(false).notNull(),
  source: mysqlEnum("source", ["manual", "router_dhcp", "router_arp", "esp32"]).default("manual").notNull(),
  firstSeen: timestamp("firstSeen").defaultNow().notNull(),
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  ownerIdIdx: index("network_devices_ownerId_idx").on(table.ownerId),
  lastSeenIdx: index("network_devices_lastSeen_idx").on(table.lastSeen),
  ownerMacUnique: uniqueIndex("network_devices_owner_mac_unique").on(table.ownerId, table.macAddress),
}));

export type NetworkDevice = typeof networkDevices.$inferSelect;
export type InsertNetworkDevice = typeof networkDevices.$inferInsert;

/**
 * AI Conversations table for storing chat histories
 */
export const aiConversations = mysqlTable("ai_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }),
  systemPrompt: text("systemPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("ai_conversations_userId_idx").on(table.userId),
}));

export type AIConversation = typeof aiConversations.$inferSelect;
export type InsertAIConversation = typeof aiConversations.$inferInsert;

/**
 * AI Messages table for storing conversation messages
 */
export const aiMessages = mysqlTable("ai_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => aiConversations.id),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: longtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("ai_messages_conversationId_idx").on(table.conversationId),
}));

export type AIMessage = typeof aiMessages.$inferSelect;
export type InsertAIMessage = typeof aiMessages.$inferInsert;

/**
 * Global bring-your-own-key configuration for the dashboard chat.
 * The API key is encrypted before storage and is never returned to the client.
 */
export const aiProviderConfigs = mysqlTable("ai_provider_configs", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 32 }).notNull().unique(),
  providerName: varchar("providerName", { length: 100 }).notNull(),
  baseUrl: varchar("baseUrl", { length: 500 }).notNull(),
  model: varchar("model", { length: 160 }).notNull(),
  encryptedApiKey: text("encryptedApiKey").notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  updatedBy: int("updatedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  activeProviderIdx: index("ai_provider_configs_isActive_idx").on(table.isActive),
}));

export type AIProviderConfig = typeof aiProviderConfigs.$inferSelect;
export type InsertAIProviderConfig = typeof aiProviderConfigs.$inferInsert;

/**
 * CRUD Records table for generic data management
 */
export const crudRecords = mysqlTable("crud_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  recordType: varchar("recordType", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  data: json("data"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  tags: json("tags"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("crud_records_userId_idx").on(table.userId),
  recordTypeIdx: index("crud_records_recordType_idx").on(table.recordType),
  statusIdx: index("crud_records_status_idx").on(table.status),
}));

export type CRUDRecord = typeof crudRecords.$inferSelect;
export type InsertCRUDRecord = typeof crudRecords.$inferInsert;

/**
 * WiFi Scans table for storing WiFi analysis data from ESP8266
 */
export const wifiScans = mysqlTable("wifi_scans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  saturacionGeneral: decimal("saturacionGeneral", { precision: 5, scale: 2 }).notNull(),
  ocupacionEspectral: decimal("ocupacionEspectral", { precision: 5, scale: 2 }),
  perdidaPaquetes: decimal("perdidaPaquetes", { precision: 5, scale: 2 }),
  totalRedes: int("totalRedes").notNull(),
  tendenciaIA: decimal("tendenciaIA", { precision: 5, scale: 2 }),
  canalOptimo: int("canalOptimo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("wifi_scans_userId_idx").on(table.userId),
  timestampIdx: index("wifi_scans_timestamp_idx").on(table.timestamp),
}));

export type WiFiScan = typeof wifiScans.$inferSelect;
export type InsertWiFiScan = typeof wifiScans.$inferInsert;

/**
 * WiFi networks observed during an individual ESP32 scan.
 * These are radio observations, not a registry of connected client devices.
 */
export const wifiNetworks = mysqlTable("wifi_networks", {
  id: int("id").autoincrement().primaryKey(),
  scanId: int("scanId").notNull().references(() => wifiScans.id),
  ssid: varchar("ssid", { length: 255 }),
  bssid: varchar("bssid", { length: 24 }),
  canal: int("canal").notNull(),
  rssi: int("rssi").notNull(),
  encriptacion: varchar("encriptacion", { length: 80 }),
  oculto: boolean("oculto").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  scanIdIdx: index("wifi_networks_scanId_idx").on(table.scanId),
  canalIdx: index("wifi_networks_canal_idx").on(table.canal),
}));

export type WiFiNetwork = typeof wifiNetworks.$inferSelect;
export type InsertWiFiNetwork = typeof wifiNetworks.$inferInsert;

/**
 * WiFi Channels table for storing per-channel analysis
 */
export const wifiChannels = mysqlTable("wifi_channels", {
  id: int("id").autoincrement().primaryKey(),
  scanId: int("scanId").notNull().references(() => wifiScans.id),
  canal: int("canal").notNull(),
  saturacion: decimal("saturacion", { precision: 5, scale: 2 }).notNull(),
  ocupacionEspectral: decimal("ocupacionEspectral", { precision: 5, scale: 2 }),
  interferencia: decimal("interferencia", { precision: 5, scale: 2 }),
  perdidaPaquetes: decimal("perdidaPaquetes", { precision: 5, scale: 2 }),
  riesgoAnomalia: decimal("riesgoAnomalia", { precision: 5, scale: 2 }),
  rssi: int("rssi"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  scanIdIdx: index("wifi_channels_scanId_idx").on(table.scanId),
  canalIdx: index("wifi_channels_canal_idx").on(table.canal),
}));

export type WiFiChannel = typeof wifiChannels.$inferSelect;
export type InsertWiFiChannel = typeof wifiChannels.$inferInsert;

/**
 * WiFi Alerts table for storing detected anomalies
 */
export const wifiAlerts = mysqlTable("wifi_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  scanId: int("scanId").references(() => wifiScans.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  tipo: mysqlEnum("tipo", ["saturacion", "perdida", "ocupacion", "interferencia", "anomalia"]).notNull(),
  descripcion: text("descripcion").notNull(),
  severidad: mysqlEnum("severidad", ["info", "warning", "critical"]).default("warning").notNull(),
  resuelta: boolean("resuelta").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("wifi_alerts_userId_idx").on(table.userId),
  timestampIdx: index("wifi_alerts_timestamp_idx").on(table.timestamp),
}));

export type WiFiAlert = typeof wifiAlerts.$inferSelect;
export type InsertWiFiAlert = typeof wifiAlerts.$inferInsert;

/**
 * WiFi Predictions table for storing AI predictions
 */
export const wifiPredictions = mysqlTable("wifi_predictions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  saturacionPredicha: decimal("saturacionPredicha", { precision: 5, scale: 2 }).notNull(),
  riesgoAnomalia: decimal("riesgoAnomalia", { precision: 5, scale: 2 }).notNull(),
  canalOptimoPredicho: int("canalOptimoPredicho"),
  analisisPrediccion: text("analisisPrediccion"),
  confianza: decimal("confianza", { precision: 5, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("wifi_predictions_userId_idx").on(table.userId),
  timestampIdx: index("wifi_predictions_timestamp_idx").on(table.timestamp),
}));

export type WiFiPrediction = typeof wifiPredictions.$inferSelect;
export type InsertWiFiPrediction = typeof wifiPredictions.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  dashboardMetrics: many(dashboardMetrics),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  documents: many(documents),
  aiConversations: many(aiConversations),
  crudRecords: many(crudRecords),
}));

export const aiConversationsRelations = relations(aiConversations, ({ many }) => ({
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));
