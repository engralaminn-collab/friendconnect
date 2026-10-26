/**
 * Identity domain: users, profiles, credentials, sessions, devices,
 * preferences and one-time verification tokens.
 */
import {
  datetime,
  index,
  json,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
  int,
} from "drizzle-orm/mysql-core";

const now = () => new Date();

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    handle: varchar("handle", { length: 32 }),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    emailVerifiedAt: datetime("email_verified_at", { fsp: 3 }),
    failedLoginCount: int("failed_login_count").notNull().default(0),
    lockedUntil: datetime("locked_until", { fsp: 3 }),
    lastLoginAt: datetime("last_login_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
    deletedAt: datetime("deleted_at", { fsp: 3 }),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_uq").on(t.email),
    handleIdx: uniqueIndex("users_handle_uq").on(t.handle),
    statusIdx: index("users_status_idx").on(t.status),
  }),
);

export const profiles = mysqlTable("profiles", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  avatarMediaId: varchar("avatar_media_id", { length: 36 }),
  phone: varchar("phone", { length: 32 }),
  city: varchar("city", { length: 120 }),
  country: varchar("country", { length: 120 }),
  locale: varchar("locale", { length: 10 }).default("en"),
  timezone: varchar("timezone", { length: 64 }),
  headline: varchar("headline", { length: 200 }),
  website: varchar("website", { length: 500 }),
  metadata: json("metadata"),
  updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
});

/** External identity accounts (OAuth/OIDC/SAML when a provider is configured). */
export const authIdentities = mysqlTable(
  "auth_identities",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    providerData: json("provider_data"),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    providerUq: uniqueIndex("auth_identities_provider_uq").on(t.provider, t.providerAccountId),
    userIdx: index("auth_identities_user_idx").on(t.userId),
  }),
);

export const deviceSessions = mysqlTable(
  "device_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 20 }),
    browser: varchar("browser", { length: 40 }),
    os: varchar("os", { length: 60 }),
    deviceName: varchar("device_name", { length: 120 }),
    pushToken: varchar("push_token", { length: 255 }),
    lastSeenAt: datetime("last_seen_at", { fsp: 3 }).notNull().$defaultFn(now),
    revokedAt: datetime("revoked_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({ userIdx: index("device_sessions_user_idx").on(t.userId) }),
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 hex of the opaque session token. The raw token only lives in the cookie. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    deviceId: varchar("device_id", { length: 36 }).references(() => deviceSessions.id, {
      onDelete: "set null",
    }),
    userAgent: varchar("user_agent", { length: 300 }),
    ip: varchar("ip", { length: 45 }),
    lastSeenAt: datetime("last_seen_at", { fsp: 3 }).notNull().$defaultFn(now),
    expiresAt: datetime("expires_at", { fsp: 3 }).notNull(),
    revokedAt: datetime("revoked_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    tokenUq: uniqueIndex("sessions_token_uq").on(t.tokenHash),
    userIdx: index("sessions_user_idx").on(t.userId),
    expiryIdx: index("sessions_expiry_idx").on(t.expiresAt),
  }),
);

export const userPreferences = mysqlTable("user_preferences", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  preferences: json("preferences").notNull(),
  updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
});

export const verificationTokens = mysqlTable(
  "verification_tokens",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { fsp: 3 }).notNull(),
    consumedAt: datetime("consumed_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    tokenUq: uniqueIndex("verification_tokens_token_uq").on(t.tokenHash),
    userIdx: index("verification_tokens_user_idx").on(t.userId),
  }),
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { fsp: 3 }).notNull(),
    consumedAt: datetime("consumed_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    tokenUq: uniqueIndex("password_reset_tokens_token_uq").on(t.tokenHash),
    userIdx: index("password_reset_tokens_user_idx").on(t.userId),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
