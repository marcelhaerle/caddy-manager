import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export type UserRole = "admin" | "editor" | "viewer";

export type InstanceAuthType = "none" | "bearer" | "basic" | "custom_header";
export type InstanceEnvironment = "production" | "staging" | "dev";
export type InstanceStatus = "online" | "offline" | "error";

export type RevisionActionType =
  | "create_proxy"
  | "update_proxy"
  | "delete_proxy"
  | "raw_edit"
  | "caddyfile_import"
  | "rollback"
  | "sync";

export type RevisionStatus = "applied" | "failed";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().notNull().default("viewer"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const caddyInstances = sqliteTable("caddy_instances", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  adminUrl: text("admin_url").notNull(),
  authType: text("auth_type")
    .$type<InstanceAuthType>()
    .notNull()
    .default("none"),
  encryptedAuthSecret: text("encrypted_auth_secret"),
  environment: text("environment")
    .$type<InstanceEnvironment>()
    .notNull()
    .default("dev"),
  lastStatus: text("last_status")
    .$type<InstanceStatus>()
    .notNull()
    .default("offline"),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
  lastKnownConfigHash: text("last_known_config_hash"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const configRevisions = sqliteTable("config_revisions", {
  id: text("id").primaryKey(),
  instanceId: text("instance_id")
    .notNull()
    .references(() => caddyInstances.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  revisionNumber: integer("revision_number").notNull(),
  actionType: text("action_type").$type<RevisionActionType>().notNull(),
  summary: text("summary").notNull(),
  previousConfigJson: text("previous_config_json").notNull(),
  newConfigJson: text("new_config_json").notNull(),
  status: text("status").$type<RevisionStatus>().notNull(),
  errorMessage: text("error_message"),
  revertedFromRevisionId: text("reverted_from_revision_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SafeUser = Omit<User, "passwordHash">;

export type CaddyInstance = typeof caddyInstances.$inferSelect;
export type NewCaddyInstance = typeof caddyInstances.$inferInsert;

export type ConfigRevision = typeof configRevisions.$inferSelect;
export type NewConfigRevision = typeof configRevisions.$inferInsert;
