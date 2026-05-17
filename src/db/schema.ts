import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);

export const resourceStatusEnum = pgEnum("resource_status", [
  "available",
  "requisitioned",
  "unavailable",
  "hidden",
  "removed",
]);

export const resourceConditionEnum = pgEnum("resource_condition", [
  "new",
  "like_new",
  "very_good",
  "good",
  "acceptable",
]);

export const loanStatusEnum = pgEnum("loan_status", [
  "pending",
  "active",
  "overdue",
  "return_pending",
  "returned",
  "rejected",
  "cancelled",
]);

export const loanEventTypeEnum = pgEnum("loan_event_type", [
  "created",
  "return_requested",
  "returned",
  "cancelled",
  "overdue_flagged",
  "due_date_extended",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "loan_created",
  "loan_approved",
  "loan_rejected",
  "return_requested",
  "resource_returned",
  "due_soon",
  "overdue",
  "loan_cancelled",
  "resource_hidden",
  "system",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "USER_REGISTERED",
  "USER_LOGIN",
  "USER_LOGIN_FAILED",
  "USER_LOGOUT",
  "USER_PASSWORD_CHANGED",
  "USER_PASSWORD_RESET",
  "USER_STATUS_CHANGED",
  "USER_ROLE_CHANGED",
  "RESOURCE_CREATED",
  "RESOURCE_UPDATED",
  "RESOURCE_REMOVED",
  "RESOURCE_HIDDEN",
  "RESOURCE_RESTORED",
  "LOAN_CREATED",
  "LOAN_RETURNED",
  "LOAN_CANCELLED",
  "LOAN_OVERDUE_FLAGGED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_STATUS_CHANGED",
]);

// ─────────────────────────────────────────────────────────────
// Tables
// ─────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 180 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("student"),
    contact: varchar("contact", { length: 40 }),
    photoUrl: text("photo_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Garante email único sem diferenciar maiúsculas/minúsculas.
    uniqueIndex("users_email_unique").using("btree", sql`lower(${table.email})`),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("refresh_tokens_token_hash_unique").on(table.tokenHash),
    index("refresh_tokens_user_id_idx").on(table.userId),
    index("refresh_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const resourceCategories = pgTable("resource_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => resourceCategories.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    condition: resourceConditionEnum("condition").notNull(),
    status: resourceStatusEnum("status").notNull().default("available"),
    preLoanStatus: resourceStatusEnum("pre_loan_status"),
    location: varchar("location", { length: 180 }).notNull(),
    visibleFrom: timestamp("visible_from", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("resources_owner_id_idx").on(table.ownerId),
    index("resources_category_id_idx").on(table.categoryId),
    index("resources_status_idx")
      .on(table.status)
      .where(sql`${table.deletedAt} is null`),
    index("resources_visible_from_idx")
      .on(table.visibleFrom.desc())
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const resourceImages = pgTable(
  "resource_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade", onUpdate: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 180 }),
    isCover: boolean("is_cover").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // No máximo uma imagem de capa por recurso.
    uniqueIndex("resource_images_cover_unique")
      .on(table.resourceId)
      .where(sql`${table.isCover} = true`),
  ],
);

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "restrict", onUpdate: "cascade" }),
    borrowerId: uuid("borrower_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    status: loanStatusEnum("status").notNull().default("active"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    dueDate: date("due_date", { mode: "date" }).notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true, mode: "date" }),
    returnNotes: text("return_notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Apenas uma requisição activa, atrasada ou com devolução pendente por recurso.
    uniqueIndex("loans_resource_active_unique")
      .on(table.resourceId)
      .where(sql`${table.status} in ('active', 'overdue', 'return_pending')`),

    check("loans_no_self_loan", sql`${table.borrowerId} <> ${table.ownerId}`),
    check("loans_due_date_future", sql`${table.dueDate} > date(${table.requestedAt})`),

    index("loans_borrower_id_idx").on(table.borrowerId),
    index("loans_owner_id_idx").on(table.ownerId),
    index("loans_resource_id_idx").on(table.resourceId),
    index("loans_status_idx").on(table.status),
    index("loans_due_date_idx")
      .on(table.dueDate)
      .where(sql`${table.status} in ('active', 'overdue')`),
  ],
);

export const loanEvents = pgTable(
  "loan_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade", onUpdate: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    eventType: loanEventTypeEnum("event_type").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("loan_events_loan_id_idx").on(table.loanId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    message: text("message").notNull(),
    entityType: varchar("entity_type", { length: 40 }),
    entityId: uuid("entity_id"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_unread_idx")
      .on(table.userId, table.createdAt.desc())
      .where(sql`${table.isRead} = false`),
    index("notifications_entity_idx")
      .on(table.entityType, table.entityId)
      .where(sql`${table.entityId} is not null`),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: uuid("entity_id"),
    oldValue: jsonb("old_value").$type<Record<string, unknown>>(),
    newValue: jsonb("new_value").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt.desc()),
    index("audit_logs_action_idx").on(table.action),
  ],
);

// ─────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  resources: many(resources, { relationName: "owner" }),
  loansAsBorrower: many(loans, { relationName: "borrower" }),
  loansAsOwner: many(loans, { relationName: "loanOwner" }),
  refreshTokens: many(refreshTokens),
  notifications: many(notifications),
  auditLogs: many(auditLogs, { relationName: "actor" }),
  loanEvents: many(loanEvents, { relationName: "eventActor" }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const resourceCategoriesRelations = relations(resourceCategories, ({ many }) => ({
  resources: many(resources),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  owner: one(users, {
    fields: [resources.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  category: one(resourceCategories, {
    fields: [resources.categoryId],
    references: [resourceCategories.id],
  }),
  images: many(resourceImages),
  loans: many(loans),
}));

export const resourceImagesRelations = relations(resourceImages, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceImages.resourceId],
    references: [resources.id],
  }),
}));

export const loansRelations = relations(loans, ({ one, many }) => ({
  resource: one(resources, {
    fields: [loans.resourceId],
    references: [resources.id],
  }),
  borrower: one(users, {
    fields: [loans.borrowerId],
    references: [users.id],
    relationName: "borrower",
  }),
  owner: one(users, {
    fields: [loans.ownerId],
    references: [users.id],
    relationName: "loanOwner",
  }),
  events: many(loanEvents),
}));

export const loanEventsRelations = relations(loanEvents, ({ one }) => ({
  loan: one(loans, {
    fields: [loanEvents.loanId],
    references: [loans.id],
  }),
  actor: one(users, {
    fields: [loanEvents.actorId],
    references: [users.id],
    relationName: "eventActor",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
    relationName: "actor",
  }),
}));

// ─────────────────────────────────────────────────────────────
// Infer Types
// ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type ResourceCategory = typeof resourceCategories.$inferSelect;
export type NewResourceCategory = typeof resourceCategories.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

export type ResourceImage = typeof resourceImages.$inferSelect;
export type NewResourceImage = typeof resourceImages.$inferInsert;

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export type LoanEvent = typeof loanEvents.$inferSelect;
export type NewLoanEvent = typeof loanEvents.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
