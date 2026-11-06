import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { eq, count } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type SafeUser, type UserRole } from "@/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  signSessionToken,
  verifySessionToken,
} from "./auth-jwt";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Checks if an admin account exists; if the users table is empty and
 * ADMIN_USERNAME + ADMIN_PASSWORD environment variables are set, seeds the admin user.
 */
export async function hasAdminAccount(): Promise<boolean> {
  const db = getDb();
  const [{ value: userCount }] = db
    .select({ value: count() })
    .from(users)
    .all();

  if (userCount > 0) {
    return true;
  }

  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;
  const envEmail =
    process.env.ADMIN_EMAIL?.trim() ||
    (envUsername ? `${envUsername}@local.dev` : undefined);

  if (envUsername && envPassword && envEmail) {
    const now = new Date();
    const passwordHash = await hashPassword(envPassword);
    db.insert(users)
      .values({
        id: crypto.randomUUID(),
        username: envUsername,
        email: envEmail.toLowerCase(),
        passwordHash,
        role: "admin",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return true;
  }

  return false;
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const db = getDb();
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .get();

  if (!user || !user.isActive) {
    return null;
  }

  return toSafeUser(user);
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function setSessionCookie(user: SafeUser): Promise<void> {
  const token = await signSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
