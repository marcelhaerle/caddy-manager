import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  hasAdminAccount,
  setSessionCookie,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const initialized = await hasAdminAccount();
    if (!initialized) {
      return NextResponse.json(
        {
          error: "System is not initialized yet. Complete admin setup first.",
          needsSetup: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid credentials" },
        { status: 400 }
      );
    }

    const identifier = parsed.data.identifier.trim();
    const db = getDb();

    const user = db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, identifier),
          eq(users.email, identifier.toLowerCase())
        )
      )
      .get();

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error:
            "This user account has been deactivated. Contact the administrator.",
        },
        { status: 403 }
      );
    }

    const validPassword = await verifyPassword(
      parsed.data.password,
      user.passwordHash
    );
    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    const safeUser = toSafeUser(user);
    await setSessionCookie(safeUser);

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed." },
      { status: 500 }
    );
  }
}
