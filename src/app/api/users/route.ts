import { NextResponse } from "next/server";
import crypto from "crypto";
import { asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, requireRole, toSafeUser } from "@/lib/auth";
import { createUserSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireRole(["admin"]);
    const db = getDb();
    const allUsers = db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt))
      .all()
      .map(toSafeUser);

    return NextResponse.json({ users: allUsers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Only the administrator can manage users." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid user data" },
        { status: 400 }
      );
    }

    const db = getDb();
    const cleanUsername = parsed.data.username.trim();
    const cleanEmail = parsed.data.email.trim().toLowerCase();

    const conflict = db
      .select()
      .from(users)
      .where(or(eq(users.username, cleanUsername), eq(users.email, cleanEmail)))
      .get();

    if (conflict) {
      return NextResponse.json(
        { error: "A user with that username or email already exists." },
        { status: 409 }
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(parsed.data.password);

    const newUser = {
      id: crypto.randomUUID(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(users).values(newUser).run();

    return NextResponse.json({ user: toSafeUser(newUser) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Only the administrator can create users." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create user." },
      { status: 500 }
    );
  }
}
