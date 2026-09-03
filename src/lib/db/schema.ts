import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  dataKey: text("data_key"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const beneficiaries = sqliteTable("beneficiaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  relationship: text("relationship").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const beneficiaryGroups = sqliteTable("beneficiary_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const beneficiaryGroupMembers = sqliteTable(
  "beneficiary_group_members",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => beneficiaryGroups.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id")
      .notNull()
      .references(() => beneficiaries.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.beneficiaryId] })],
);

export const legacyAssets = sqliteTable("legacy_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category", {
    enum: ["hesap", "belge", "talimat", "sifre", "diger"],
  }).notNull(),
  description: text("description"),
  details: text("details"),
  beneficiaryId: integer("beneficiary_id").references(() => beneficiaries.id, {
    onDelete: "set null",
  }),
  priority: text("priority", { enum: ["dusuk", "orta", "yuksek"] })
    .notNull()
    .default("orta"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  beneficiaryId: integer("beneficiary_id")
    .notNull()
    .references(() => beneficiaries.id, { onDelete: "cascade" }),
  deliveryType: text("delivery_type", {
    enum: ["hemen", "hareketsizlik", "manuel"],
  })
    .notNull()
    .default("manuel"),
  status: text("status", { enum: ["taslak", "hazir", "teslim"] })
    .notNull()
    .default("taslak"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const deliveries = sqliteTable("deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  beneficiaryId: integer("beneficiary_id")
    .notNull()
    .references(() => beneficiaries.id, { onDelete: "cascade" }),
  trigger: text("trigger", {
    enum: ["hemen", "hareketsizlik", "manuel"],
  }).notNull(),
  snapshot: text("snapshot"),
  deliveredAt: integer("delivered_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const calendarMemories = sqliteTable("calendar_memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryDate: text("entry_date").notNull(),
  title: text("title"),
  content: text("content"),
  videoFileName: text("video_file_name"),
  videoMimeType: text("video_mime_type"),
  thumbnailFileName: text("thumbnail_file_name"),
  mood: text("mood"),
  location: text("location"),
  beneficiaryId: integer("beneficiary_id").references(() => beneficiaries.id, {
    onDelete: "set null",
  }),
  leaveToBeneficiary: integer("leave_to_beneficiary", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messageBeneficiaries = sqliteTable(
  "message_beneficiaries",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id")
      .notNull()
      .references(() => beneficiaries.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.messageId, table.beneficiaryId] })],
);

export const messageGroups = sqliteTable(
  "message_groups",
  {
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => beneficiaryGroups.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.messageId, table.groupId] })],
);

export const assetBeneficiaries = sqliteTable(
  "asset_beneficiaries",
  {
    assetId: integer("asset_id")
      .notNull()
      .references(() => legacyAssets.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id")
      .notNull()
      .references(() => beneficiaries.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.assetId, table.beneficiaryId] })],
);

export const assetGroups = sqliteTable(
  "asset_groups",
  {
    assetId: integer("asset_id")
      .notNull()
      .references(() => legacyAssets.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => beneficiaryGroups.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.assetId, table.groupId] })],
);

export const calendarBeneficiaries = sqliteTable(
  "calendar_beneficiaries",
  {
    memoryId: integer("memory_id")
      .notNull()
      .references(() => calendarMemories.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id")
      .notNull()
      .references(() => beneficiaries.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.memoryId, table.beneficiaryId] })],
);

export const calendarGroups = sqliteTable(
  "calendar_groups",
  {
    memoryId: integer("memory_id")
      .notNull()
      .references(() => calendarMemories.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => beneficiaryGroups.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.memoryId, table.groupId] })],
);

export type Beneficiary = typeof beneficiaries.$inferSelect;
export type NewBeneficiary = typeof beneficiaries.$inferInsert;
export type BeneficiaryGroup = typeof beneficiaryGroups.$inferSelect;
export type LegacyAsset = typeof legacyAssets.$inferSelect;
export type NewLegacyAsset = typeof legacyAssets.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type CalendarMemory = typeof calendarMemories.$inferSelect;
export type NewCalendarMemory = typeof calendarMemories.$inferInsert;
