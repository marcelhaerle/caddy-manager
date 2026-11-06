import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { signSessionToken, verifySessionToken } from "@/lib/auth-jwt";
import { getDb } from "@/db";
import { users } from "@/db/schema";

describe("AES-256-GCM Secret Encryption", () => {
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
});

describe("JWT Session Tokens", () => {
  it("signs and verifies operator session payloads", async () => {
    const payload = {
      userId: "user-1",
      username: "admin",
      email: "admin@local.dev",
      role: "admin" as const,
    };

    const token = await signSessionToken(payload);
    const verified = await verifySessionToken(token);

    expect(verified).toEqual(payload);
  });

  it("returns null for tampered tokens", async () => {
    const verified = await verifySessionToken("invalid.token.string");
    expect(verified).toBeNull();
  });
});

describe("SQLite & Drizzle Schema", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = ":memory:";
    global.__caddyManagerDb = undefined;
  });

  it("inserts and queries users with roles", () => {
    const db = getDb();
    const now = new Date();
    const id = crypto.randomUUID();

    db.insert(users)
      .values({
        id,
        username: "admin",
        email: "admin@local.dev",
        passwordHash: "hashed_pw",
        role: "admin",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const found = db.select().from(users).where(eq(users.id, id)).get();
    expect(found).toBeDefined();
    expect(found?.username).toBe("admin");
    expect(found?.role).toBe("admin");
  });
});
