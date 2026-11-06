import { NextResponse } from "next/server";
import crypto from "crypto";
import { count } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  hasAdminAccount,
  hashPassword,
  setSessionCookie,
  toSafeUser,
} from "@/lib/auth";
import { setupAdminSchema } from "@/lib/validators";

export async function GET() {
  const initialized = await hasAdminAccount();
  return NextResponse.json({ initialized });
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const [{ value: existingUsers }] = db
      .select({ value: count() })
      .from(users)
      .all();

    if (existingUsers > 0) {
      return NextResponse.json(
        { error: "Admin account has already been initialized." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = setupAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Invalid input",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(parsed.data.password);

    const adminUser = {
      id: crypto.randomUUID(),
      username: parsed.data.username.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      passwordHash,
      role: "admin" as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(users).values(adminUser).run();

    const safeUser = toSafeUser(adminUser);
    await setSessionCookie(safeUser);

    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error("Failed to initialize admin:", error);
    return NextResponse.json(
      { error: "Failed to initialize admin account." },
      { status: 500 }
    );
  }
}
