import crypto from "crypto";
import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@better-auth/utils/password";
import { serializeSignedCookie } from "better-call";
import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import prisma from "@/lib/prisma";
import { ensureNeonAuthSchema } from "@/lib/neonAuthSchema";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function extractRawTokenFromHeader(cookieHeader) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const name = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (!val) continue;
    if (
      name === NEON_AUTH_SESSION_COOKIE_NAME ||
      name === "aurena_session_token" ||
      name === "aurena_auth_token"
    ) {
      let decoded = val;
      try {
        decoded = decodeURIComponent(val);
      } catch {
        // Keep raw
      }
      const dotIdx = decoded.indexOf(".");
      const token = dotIdx > 0 ? decoded.slice(0, dotIdx) : decoded;
      if (token) return token;
    }
  }
  return "";
}

async function createSessionForUser(userId, request, rememberMe = true) {
  const env = getServerEnv();
  const sessionId = crypto.randomUUID();
  const rawToken = crypto.randomBytes(24).toString("hex");
  const maxAge = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24;
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "AurenaBrowser";

  await prisma.$executeRaw`
    INSERT INTO "neon_auth"."session" (
      "id",
      "userId",
      "token",
      "expiresAt",
      "ipAddress",
      "userAgent",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${sessionId}::uuid,
      ${userId}::uuid,
      ${rawToken},
      ${expiresAt},
      ${ipAddress},
      ${userAgent},
      NOW(),
      NOW()
    )
  `;

  const signedSetCookie = await serializeSignedCookie(
    NEON_AUTH_SESSION_COOKIE_NAME,
    rawToken,
    env.AUTH_SECRET,
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge
    }
  );

  // Extract the signed value `<rawToken>.<sig>` from the serialized Set-Cookie header
  const eqIdx = signedSetCookie.indexOf("=");
  const semiIdx = signedSetCookie.indexOf(";");
  const signedTokenValue = decodeURIComponent(
    signedSetCookie.slice(eqIdx + 1, semiIdx > -1 ? semiIdx : undefined)
  );

  return {
    session: {
      id: sessionId,
      userId: String(userId),
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    signedSetCookie,
    signedTokenValue
  };
}

function formatNeonUser(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    emailVerified: Boolean(row.emailVerified),
    image: row.image || null,
    role: row.role || "user",
    banned: Boolean(row.banned),
    createdAt: row.createdAt
      ? new Date(row.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: row.updatedAt
      ? new Date(row.updatedAt).toISOString()
      : new Date().toISOString()
  };
}

export async function GET(request, { params }) {
  const path = (params?.all || []).join("/");
  await ensureNeonAuthSchema();

  if (path === "get-session") {
    const rawToken = extractRawTokenFromHeader(request.headers.get("cookie"));
    if (!rawToken) {
      return NextResponse.json(null, { status: 200 });
    }

    const rows = await prisma.$queryRaw`
      SELECT
        s."id" AS "sessionId",
        s."userId" AS "userId",
        s."token" AS "token",
        s."expiresAt" AS "expiresAt",
        s."ipAddress" AS "ipAddress",
        s."userAgent" AS "userAgent",
        s."createdAt" AS "sessionCreatedAt",
        s."updatedAt" AS "sessionUpdatedAt",
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."emailVerified" AS "emailVerified",
        u."image" AS "image",
        u."role" AS "role",
        u."banned" AS "banned",
        u."createdAt" AS "createdAt",
        u."updatedAt" AS "updatedAt"
      FROM "neon_auth"."session" s
      INNER JOIN "neon_auth"."user" u ON u."id" = s."userId"
      WHERE s."token" = ${rawToken}
      LIMIT 1
    `;

    const row = rows?.[0];
    if (!row || new Date(row.expiresAt) <= new Date() || row.banned) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(
      {
        session: {
          id: String(row.sessionId),
          userId: String(row.userId),
          token: row.token,
          expiresAt: new Date(row.expiresAt).toISOString(),
          ipAddress: row.ipAddress || "127.0.0.1",
          userAgent: row.userAgent || "",
          createdAt: new Date(row.sessionCreatedAt).toISOString(),
          updatedAt: new Date(row.sessionUpdatedAt).toISOString()
        },
        user: formatNeonUser(row)
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function POST(request, { params }) {
  const path = (params?.all || []).join("/");
  await ensureNeonAuthSchema();
  const body = await request.json().catch(() => ({}));

  if (path === "sign-up/email") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || email.split("@")[0] || "Guest").trim();
    const image = body.image || null;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.$queryRaw`
      SELECT "id" FROM "neon_auth"."user" WHERE LOWER("email") = ${email} LIMIT 1
    `;
    if (existing?.length > 0) {
      return NextResponse.json(
        { message: "User already exists with this email." },
        { status: 422 }
      );
    }

    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await prisma.$executeRaw`
      INSERT INTO "neon_auth"."user" (
        "id",
        "name",
        "email",
        "emailVerified",
        "image",
        "role",
        "banned",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${userId}::uuid,
        ${name},
        ${email},
        TRUE,
        ${image},
        'user',
        FALSE,
        NOW(),
        NOW()
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO "neon_auth"."account" (
        "id",
        "accountId",
        "providerId",
        "userId",
        "password",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${accountId}::uuid,
        ${userId},
        'credential',
        ${userId}::uuid,
        ${passwordHash},
        NOW(),
        NOW()
      )
    `;

    const { signedSetCookie, signedTokenValue } = await createSessionForUser(
      userId,
      request,
      true
    );

    const userObj = {
      id: userId,
      name,
      email,
      emailVerified: true,
      image,
      role: "user",
      banned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = NextResponse.json(
      {
        token: signedTokenValue,
        user: userObj
      },
      { status: 200 }
    );
    res.headers.append("set-cookie", signedSetCookie);
    return res;
  }

  if (path === "sign-in/email") {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const rememberMe = Boolean(body.rememberMe ?? true);

    const rows = await prisma.$queryRaw`
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."emailVerified" AS "emailVerified",
        u."image" AS "image",
        u."role" AS "role",
        u."banned" AS "banned",
        u."createdAt" AS "createdAt",
        u."updatedAt" AS "updatedAt",
        a."password" AS "passwordHash"
      FROM "neon_auth"."user" u
      INNER JOIN "neon_auth"."account" a
        ON a."userId" = u."id" AND a."providerId" = 'credential'
      WHERE LOWER(u."email") = ${email}
      LIMIT 1
    `;

    const row = rows?.[0];
    if (!row || !row.passwordHash) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (row.banned) {
      return NextResponse.json(
        { message: "This account is banned or inactive." },
        { status: 403 }
      );
    }

    const valid =
      verifyPassword.length >= 2
        ? await verifyPassword(row.passwordHash, password)
        : await verifyPassword({
            hash: row.passwordHash,
            password
          });
    if (!valid) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const { signedSetCookie, signedTokenValue } = await createSessionForUser(
      row.id,
      request,
      rememberMe
    );

    const res = NextResponse.json(
      {
        redirect: false,
        token: signedTokenValue,
        user: formatNeonUser(row)
      },
      { status: 200 }
    );
    res.headers.append("set-cookie", signedSetCookie);
    return res;
  }

  if (path === "sign-out") {
    const rawToken = extractRawTokenFromHeader(request.headers.get("cookie"));
    if (rawToken) {
      await prisma.$executeRaw`
        DELETE FROM "neon_auth"."session"
        WHERE "token" = ${rawToken}
      `.catch(() => {});
    }
    const res = NextResponse.json({ success: true }, { status: 200 });
    res.headers.append(
      "set-cookie",
      `${NEON_AUTH_SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
    return res;
  }

  if (path === "change-password") {
    const rawToken = extractRawTokenFromHeader(request.headers.get("cookie"));
    if (!rawToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.$queryRaw`
      SELECT s."userId", a."id" AS "accountId", a."password" AS "passwordHash"
      FROM "neon_auth"."session" s
      INNER JOIN "neon_auth"."account" a
        ON a."userId" = s."userId" AND a."providerId" = 'credential'
      WHERE s."token" = ${rawToken}
        AND s."expiresAt" > NOW()
      LIMIT 1
    `;
    const record = sessions?.[0];
    if (!record) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const currentPwd = String(body.currentPassword || "");
    const valid =
      verifyPassword.length >= 2
        ? await verifyPassword(record.passwordHash, currentPwd)
        : await verifyPassword({
            hash: record.passwordHash,
            password: currentPwd
          });
    if (!valid) {
      return NextResponse.json(
        { message: "Current password is incorrect." },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(String(body.newPassword || ""));
    await prisma.$executeRaw`
      UPDATE "neon_auth"."account"
      SET "password" = ${newHash}, "updatedAt" = NOW()
      WHERE "id" = ${record.accountId}::uuid
    `;

    return NextResponse.json({ status: true }, { status: 200 });
  }

  if (path === "request-password-reset" || path === "forget-password") {
    return NextResponse.json({ status: true }, { status: 200 });
  }

  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
