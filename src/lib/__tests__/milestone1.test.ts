import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { signSessionToken, verifySessionToken } from "@/lib/auth-jwt";
import {
  hashPassword,
  verifyPassword,
  toSafeUser,
  hasAdminAccount,
} from "@/lib/auth";
import { cn, formatTimestamp } from "@/lib/utils";
import {
  setupAdminSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
} from "@/lib/validators";
import { getDb } from "@/db";
import { users } from "@/db/schema";

describe("AES-256-GCM Secret Encryption (src/lib/crypto.ts)", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("encrypts and decrypts secrets round-trip accurately", () => {
    const rawSecret = "Bearer super-secret-caddy-admin-token-12345";
    const encrypted = encryptSecret(rawSecret);

    expect(encrypted).not.toContain(rawSecret);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it("produces unique ciphertexts for identical plaintexts (random IV)", () => {
    const first = encryptSecret("same-secret");
    const second = encryptSecret("same-secret");
    expect(first).not.toBe(second);
  });

  it("supports arbitrary passphrase ENCRYPTION_KEY via SHA-256 derivation", () => {
    process.env.ENCRYPTION_KEY = "my-custom-passphrase-not-hex";
    const ciphertext = encryptSecret("custom-key-secret");
    expect(decryptSecret(ciphertext)).toBe("custom-key-secret");
  });

  it("throws on malformed or tampered encrypted payload", () => {
    expect(() => decryptSecret("invalid-format")).toThrow(
      "Invalid encrypted secret format"
    );

    const valid = encryptSecret("sensitive-value");
    const [iv, tag] = valid.split(":");
    expect(() => decryptSecret(`${iv}:${tag}:AAAA`)).toThrow();
  });
});

describe("JWT Session Tokens (src/lib/auth-jwt.ts)", () => {
  it("signs and verifies operator session payloads for all valid roles", async () => {
    for (const role of ["admin", "editor", "viewer"] as const) {
      const payload = {
        userId: `user-${role}`,
        username: role,
        email: `${role}@local.dev`,
        role,
      };

      const token = await signSessionToken(payload);
      const verified = await verifySessionToken(token);
      expect(verified).toEqual(payload);
    }
  });

  it("returns null for invalid or tampered tokens", async () => {
    expect(await verifySessionToken("invalid.token.string")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });
});

describe("Utilities (src/lib/utils.ts)", () => {
  it("merges Tailwind classes with cn()", () => {
    expect(cn("px-2 py-1", false && "hidden", "px-4")).toBe("py-1 px-4");
  });

  it("formats Date, number, ISO string, and edge cases in formatTimestamp()", () => {
    const d = new Date("2026-11-06T16:57:00.000Z");
    expect(formatTimestamp(d)).toBe("2026-11-06 16:57:00 UTC");
    expect(formatTimestamp(d.getTime())).toBe("2026-11-06 16:57:00 UTC");
    expect(formatTimestamp(d.toISOString())).toBe("2026-11-06 16:57:00 UTC");
    expect(formatTimestamp(null)).toBe("never");
    expect(formatTimestamp(undefined)).toBe("never");
    expect(formatTimestamp("not-a-valid-date")).toBe("invalid date");
  });
});

describe("Zod Validation Schemas (src/lib/validators.ts)", () => {
  it("validates setupAdminSchema including password confirmation match", () => {
    const valid = setupAdminSchema.safeParse({
      username: "admin_user",
      email: "admin@example.com",
      password: "strongpassword123",
      confirmPassword: "strongpassword123",
    });
    expect(valid.success).toBe(true);

    const mismatch = setupAdminSchema.safeParse({
      username: "admin_user",
      email: "admin@example.com",
      password: "strongpassword123",
      confirmPassword: "differentpassword",
    });
    expect(mismatch.success).toBe(false);

    const badChars = setupAdminSchema.safeParse({
      username: "admin space!",
      email: "admin@example.com",
      password: "strongpassword123",
      confirmPassword: "strongpassword123",
    });
    expect(badChars.success).toBe(false);
  });

  it("validates loginSchema", () => {
    expect(
      loginSchema.safeParse({ identifier: "admin", password: "pw" }).success
    ).toBe(true);
    expect(
      loginSchema.safeParse({ identifier: "", password: "pw" }).success
    ).toBe(false);
  });

  it("validates createUserSchema and prevents 'admin' role injection", () => {
    expect(
      createUserSchema.safeParse({
        username: "operator1",
        email: "op1@example.com",
        password: "password123",
        role: "editor",
      }).success
    ).toBe(true);

    expect(
      createUserSchema.safeParse({
        username: "operator2",
        email: "op2@example.com",
        password: "password123",
        role: "admin",
      }).success
    ).toBe(false);
  });

  it("validates updateUserSchema", () => {
    expect(
      updateUserSchema.safeParse({ role: "viewer", isActive: false }).success
    ).toBe(true);
    expect(updateUserSchema.safeParse({ newPassword: "short" }).success).toBe(
      false
    );
  });
});

describe("Auth Helpers & SQLite Integration (src/lib/auth.ts)", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = ":memory:";
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_EMAIL;
    global.__caddyManagerDb = undefined;
  });

  it("hashes and verifies passwords with bcrypt", async () => {
    const hash = await hashPassword("my-secret-pw");
    expect(hash).not.toBe("my-secret-pw");
    expect(await verifyPassword("my-secret-pw", hash)).toBe(true);
    expect(await verifyPassword("wrong-pw", hash)).toBe(false);
  });

  it("strips passwordHash in toSafeUser()", () => {
    const now = new Date();
    const rawUser = {
      id: "u1",
      username: "alice",
      email: "alice@example.com",
      passwordHash: "secret_hash",
      role: "editor" as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const safe = toSafeUser(rawUser);
    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe.username).toBe("alice");
  });

  it("seeds admin user from environment variables when DB is empty", async () => {
    expect(await hasAdminAccount()).toBe(false);

    process.env.ADMIN_USERNAME = "envadmin";
    process.env.ADMIN_PASSWORD = "envpassword123";
    process.env.ADMIN_EMAIL = "envadmin@example.com";

    expect(await hasAdminAccount()).toBe(true);

    const db = getDb();
    const seeded = db
      .select()
      .from(users)
      .where(eq(users.username, "envadmin"))
      .get();
    expect(seeded).toBeDefined();
    expect(seeded?.role).toBe("admin");
  });
});
