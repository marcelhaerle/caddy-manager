import { describe, it, expect, beforeEach, vi } from "vitest";
import { SESSION_COOKIE_NAME } from "@/lib/auth-jwt";

// In-memory mock cookie jar so Next.js Route Handlers can read/write cookies in tests
const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

import { GET as getSetup, POST as postSetup } from "@/app/api/auth/setup/route";
import { POST as postLogin } from "@/app/api/auth/login/route";
import { POST as postLogout } from "@/app/api/auth/logout/route";
import { GET as getMe } from "@/app/api/auth/me/route";
import { GET as getUsers, POST as postUsers } from "@/app/api/users/route";
import {
  PATCH as patchUser,
  DELETE as deleteUser,
} from "@/app/api/users/[id]/route";

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("API Route Handlers (/api/auth/* & /api/users/*)", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = ":memory:";
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_EMAIL;
    global.__caddyManagerDb = undefined;
    cookieJar.clear();
  });

  it("completes first-run admin setup and blocks duplicate setup attempts", async () => {
    // 1. Initially uninitialized
    const checkRes1 = await getSetup();
    expect(await checkRes1.json()).toEqual({ initialized: false });

    // 2. Setup initial admin
    const setupRes = await postSetup(
      jsonRequest("http://localhost:3000/api/auth/setup", "POST", {
        username: "rootadmin",
        email: "root@local.dev",
        password: "supersecretpassword",
        confirmPassword: "supersecretpassword",
      })
    );
    expect(setupRes.status).toBe(201);
    const setupData = await setupRes.json();
    expect(setupData.user.username).toBe("rootadmin");
    expect(setupData.user.role).toBe("admin");
    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(true);

    // 3. Verify GET /api/auth/me returns the logged-in admin
    const meRes = await getMe();
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.username).toBe("rootadmin");

    // 4. Subsequent POST /api/auth/setup is blocked with 403
    const duplicateRes = await postSetup(
      jsonRequest("http://localhost:3000/api/auth/setup", "POST", {
        username: "hacker",
        email: "hacker@local.dev",
        password: "supersecretpassword",
        confirmPassword: "supersecretpassword",
      })
    );
    expect(duplicateRes.status).toBe(403);
  });

  it("handles login, invalid credentials, and logout", async () => {
    // Bootstrap admin
    await postSetup(
      jsonRequest("http://localhost:3000/api/auth/setup", "POST", {
        username: "admin",
        email: "admin@local.dev",
        password: "correctpassword",
        confirmPassword: "correctpassword",
      })
    );

    // Logout
    const logoutRes = await postLogout();
    expect(logoutRes.status).toBe(200);
    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(false);

    // GET /api/auth/me when logged out -> 401
    const meOut = await getMe();
    expect(meOut.status).toBe(401);

    // Login with wrong password -> 401
    const badLogin = await postLogin(
      jsonRequest("http://localhost:3000/api/auth/login", "POST", {
        identifier: "admin",
        password: "wrongpassword",
      })
    );
    expect(badLogin.status).toBe(401);

    // Login with email -> 200
    const goodLogin = await postLogin(
      jsonRequest("http://localhost:3000/api/auth/login", "POST", {
        identifier: "ADMIN@LOCAL.DEV",
        password: "correctpassword",
      })
    );
    expect(goodLogin.status).toBe(200);
    expect(cookieJar.has(SESSION_COOKIE_NAME)).toBe(true);
  });

  it("enforces RBAC on /api/users and supports full operator lifecycle", async () => {
    // 1. Unauthenticated request to /api/users -> 401
    const unauthRes = await getUsers();
    expect(unauthRes.status).toBe(401);

    // 2. Setup primary admin
    const setupRes = await postSetup(
      jsonRequest("http://localhost:3000/api/auth/setup", "POST", {
        username: "admin",
        email: "admin@local.dev",
        password: "adminpassword",
        confirmPassword: "adminpassword",
      })
    );
    const { user: adminUser } = await setupRes.json();

    // 3. Create an 'editor' operator
    const createRes = await postUsers(
      jsonRequest("http://localhost:3000/api/users", "POST", {
        username: "devops_bob",
        email: "bob@local.dev",
        password: "bobpassword123",
        role: "editor",
      })
    );
    expect(createRes.status).toBe(201);
    const { user: bobUser } = await createRes.json();
    expect(bobUser.username).toBe("devops_bob");
    expect(bobUser.role).toBe("editor");

    // 4. Duplicate username/email returns 409
    const conflictRes = await postUsers(
      jsonRequest("http://localhost:3000/api/users", "POST", {
        username: "devops_bob",
        email: "other@local.dev",
        password: "bobpassword123",
        role: "viewer",
      })
    );
    expect(conflictRes.status).toBe(409);

    // 5. Update operator role to 'viewer' & suspend account
    const patchRes = await patchUser(
      jsonRequest(`http://localhost:3000/api/users/${bobUser.id}`, "PATCH", {
        role: "viewer",
        isActive: false,
      }),
      { params: Promise.resolve({ id: bobUser.id }) }
    );
    expect(patchRes.status).toBe(200);
    const patchedData = await patchRes.json();
    expect(patchedData.user.role).toBe("viewer");
    expect(patchedData.user.isActive).toBe(false);

    // 6. Protecting primary admin from deactivation, demotion, or deletion
    const demoteAdminRes = await patchUser(
      jsonRequest(`http://localhost:3000/api/users/${adminUser.id}`, "PATCH", {
        role: "viewer",
      }),
      { params: Promise.resolve({ id: adminUser.id }) }
    );
    expect(demoteAdminRes.status).toBe(400);

    const deleteAdminRes = await deleteUser(
      new Request(`http://localhost:3000/api/users/${adminUser.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: adminUser.id }) }
    );
    expect(deleteAdminRes.status).toBe(400);

    // 7. Re-enable bob, log in as bob (non-admin), and verify 403 Forbidden on /api/users
    await patchUser(
      jsonRequest(`http://localhost:3000/api/users/${bobUser.id}`, "PATCH", {
        isActive: true,
      }),
      { params: Promise.resolve({ id: bobUser.id }) }
    );

    await postLogin(
      jsonRequest("http://localhost:3000/api/auth/login", "POST", {
        identifier: "devops_bob",
        password: "bobpassword123",
      })
    );

    const bobListUsers = await getUsers();
    expect(bobListUsers.status).toBe(403);

    // 8. Log back in as admin and delete bob
    await postLogin(
      jsonRequest("http://localhost:3000/api/auth/login", "POST", {
        identifier: "admin",
        password: "adminpassword",
      })
    );

    const deleteBobRes = await deleteUser(
      new Request(`http://localhost:3000/api/users/${bobUser.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: bobUser.id }) }
    );
    expect(deleteBobRes.status).toBe(200);

    const remainingRes = await getUsers();
    const remainingData = await remainingRes.json();
    expect(remainingData.users).toHaveLength(1);
    expect(remainingData.users[0].username).toBe("admin");
  });
});
