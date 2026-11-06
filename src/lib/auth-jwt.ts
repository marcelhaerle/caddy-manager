import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/db/schema";

export const SESSION_COOKIE_NAME = "cm_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "dev-super-secret-jwt-key-change-in-production-32chars";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.userId === "string" &&
      typeof payload.username === "string" &&
      typeof payload.email === "string" &&
      (payload.role === "admin" ||
        payload.role === "editor" ||
        payload.role === "viewer")
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
        role: payload.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DURATION_SECONDS,
};
