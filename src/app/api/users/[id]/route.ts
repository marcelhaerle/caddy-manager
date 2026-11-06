import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, requireRole, toSafeUser } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin"]);
    const { id } = await context.params;

    const db = getDb();
    const targetUser = db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    // Protect the single primary admin account from role downgrade or deactivation
    if (targetUser.role === "admin") {
      if (parsed.data.role !== undefined || parsed.data.isActive === false) {
        return NextResponse.json(
          {
            error:
              "The primary admin account cannot be deactivated or demoted.",
          },
          { status: 400 }
        );
      }
    }

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.role !== undefined && targetUser.role !== "admin") {
      updates.role = parsed.data.role;
    }

    if (parsed.data.isActive !== undefined && targetUser.role !== "admin") {
      updates.isActive = parsed.data.isActive;
    }

    if (parsed.data.newPassword) {
      updates.passwordHash = await hashPassword(parsed.data.newPassword);
    }

    db.update(users).set(updates).where(eq(users.id, id)).run();

    const updatedUser = db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();

    return NextResponse.json({ user: toSafeUser(updatedUser!) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Only the administrator can update users." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update user." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin"]);
    const { id } = await context.params;

    const db = getDb();
    const targetUser = db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      return NextResponse.json(
        { error: "The primary admin account cannot be deleted." },
        { status: 400 }
      );
    }

    try {
      db.delete(users).where(eq(users.id, id)).run();
    } catch {
      return NextResponse.json(
        {
          error:
            "User has historical audit revisions and cannot be hard-deleted. Deactivate the account instead.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Only the administrator can delete users." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete user." },
      { status: 500 }
    );
  }
}
