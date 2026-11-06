import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, hasAdminAccount, toSafeUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const initialized = await hasAdminAccount();
  if (!initialized) {
    redirect("/setup");
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "admin") {
    redirect("/");
  }

  const db = getDb();
  const allUsers = db
    .select()
    .from(users)
    .orderBy(asc(users.createdAt))
    .all()
    .map(toSafeUser);

  return (
    <AppShell user={currentUser}>
      <UsersClient initialUsers={allUsers} />
    </AppShell>
  );
}
