import crypto from "crypto";
import nodemailer from "nodemailer";
import { hashPassword, verifyPassword } from "@better-auth/utils/password";
import { prisma } from "@/lib/prisma";
import {
  AppError,
  checkRateLimit,
  clearAuthSessionCookies,
  getNeonAuthServer,
  getRawSessionTokenFromCookies,
  sanitizeUser,
  setAuthSessionCookies
} from "@/lib/auth";
import { getServerEnv, isEmailConfigured } from "@/lib/env";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  isValidIndianMobile,
  loginSchema,
  normalizeIndianMobile,
  registerSchema,
  resetPasswordSchema
} from "@/validators";
import { createNotificationOnce } from "@/services/notificationService";

export function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

export async function registerCustomer(rawInput, ipKey = "anon") {
  const rate = await checkRateLimit(`register:${ipKey}`, {
    limit: 15,
    windowSeconds: 60
  });
  if (!rate.allowed) {
    throw new AppError(
      "Too many registration attempts. Please wait a moment and try again.",
      429,
      "RATE_LIMITED"
    );
  }

  const data = registerSchema.parse(rawInput);

  const [existingEmail, existingMobile] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.user.findUnique({ where: { mobile: data.mobile } })
  ]);

  if (existingEmail) {
    throw new AppError(
      "An account with this email address already exists.",
      409,
      "DUPLICATE_EMAIL"
    );
  }

  if (existingMobile) {
    throw new AppError(
      "An account with this mobile number already exists.",
      409,
      "DUPLICATE_MOBILE"
    );
  }

  const auth = getNeonAuthServer();
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  const { data: signUpData, error: signUpError } = await auth.signUp.email({
    email: data.email,
    password: data.password,
    name: fullName,
    image: data.image || undefined
  });

  if (signUpError || !signUpData?.user?.id) {
    const errMsg = String(signUpError?.message || "");
    if (
      errMsg.toLowerCase().includes("already exists") ||
      signUpError?.status === 422
    ) {
      throw new AppError(
        "An account with this email address already exists.",
        409,
        "DUPLICATE_EMAIL"
      );
    }
    throw new AppError(
      signUpError?.message ||
        "Unable to complete registration. Please try again.",
      400,
      "REGISTRATION_FAILED"
    );
  }

  if (signUpData.token) {
    await setAuthSessionCookies(signUpData.token);
  }

  const existingToken = await getRawSessionTokenFromCookies();
  if (!existingToken) {
    const { data: signInData } = await auth.signIn.email({
      email: data.email,
      password: data.password,
      rememberMe: true
    });
    if (signInData?.token) {
      await setAuthSessionCookies(signInData.token);
    }
  }

  const createdUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        authId: signUpData.user.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        mobile: data.mobile,
        image: data.image || null,
        role: "CUSTOMER",
        active: true,
        lastLoginAt: new Date()
      }
    });

    await createNotificationOnce(
      {
        userId: user.id,
        title: "Welcome to Aurena",
        message: "Your moment of self-care starts here.",
        eventKey: `welcome:${user.id}`
      },
      tx
    );

    return user;
  });

  return sanitizeUser(createdUser);
}

export async function loginUser(
  rawInput,
  { requireAdminRole = false, ipKey = "anon" } = {}
) {
  const rate = await checkRateLimit(`login:${ipKey}`, {
    limit: 20,
    windowSeconds: 60
  });
  if (!rate.allowed) {
    throw new AppError(
      "Too many sign-in attempts. Please wait a minute before trying again.",
      429,
      "RATE_LIMITED"
    );
  }

  const parsed = loginSchema.parse(rawInput);
  const identifier = parsed.identifier.trim();

  let targetEmail = identifier.toLowerCase();
  let preloadedUser = null;

  if (isValidIndianMobile(identifier)) {
    const mobile = normalizeIndianMobile(identifier);
    preloadedUser = await prisma.user.findUnique({ where: { mobile } });
    if (!preloadedUser) {
      throw new AppError(
        "Invalid email/mobile number or password.",
        401,
        "INVALID_CREDENTIALS"
      );
    }
    targetEmail = preloadedUser.email;
  } else {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      throw new AppError(
        "Please enter a valid email address or 10-digit Indian mobile number.",
        400,
        "INVALID_IDENTIFIER"
      );
    }
    preloadedUser = await prisma.user.findUnique({
      where: { email: targetEmail }
    });
  }

  if (preloadedUser && preloadedUser.deletedAt) {
    throw new AppError(
      "Invalid email/mobile number or password.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (preloadedUser && !preloadedUser.active) {
    await clearAuthSessionCookies();
    throw new AppError(
      "Your account is currently inactive. Please contact Aurena Nails.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  const auth = getNeonAuthServer();
  const { data: signInData, error: signInError } = await auth.signIn.email({
    email: targetEmail,
    password: parsed.password,
    rememberMe: parsed.rememberMe
  });

  if (signInError || !signInData?.user?.id) {
    throw new AppError(
      "Invalid email/mobile number or password.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (signInData.token) {
    await setAuthSessionCookies(
      signInData.token,
      parsed.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24
    );
  }

  let appUser =
    preloadedUser ||
    (await prisma.user.findUnique({
      where: { authId: signInData.user.id }
    }));

  if (!appUser) {
    const nameParts = String(signInData.user.name || "Aurena Guest")
      .trim()
      .split(/\s+/);
    const firstName = nameParts[0] || "Aurena";
    const lastName = nameParts.slice(1).join(" ") || "Guest";
    appUser = await prisma.user.create({
      data: {
        authId: signInData.user.id,
        email: targetEmail,
        firstName,
        lastName,
        role: "CUSTOMER",
        active: true,
        lastLoginAt: new Date()
      }
    });
  } else {
    if (!appUser.active) {
      await auth.signOut({}).catch(() => {});
      await clearAuthSessionCookies();
      throw new AppError(
        "Your account is currently inactive. Please contact Aurena Nails.",
        403,
        "ACCOUNT_INACTIVE"
      );
    }

    appUser = await prisma.user.update({
      where: { id: appUser.id },
      data: {
        authId: signInData.user.id,
        lastLoginAt: new Date()
      }
    });
  }

  if (requireAdminRole && appUser.role !== "ADMIN") {
    await auth.signOut({}).catch(() => {});
    await clearAuthSessionCookies();
    throw new AppError(
      "Forbidden: Administrator credentials are required to access the admin portal.",
      403,
      "FORBIDDEN"
    );
  }

  return sanitizeUser(appUser);
}

export async function logoutUser() {
  const rawToken = await getRawSessionTokenFromCookies();
  const auth = getNeonAuthServer();
  await auth.signOut({}).catch(() => {});
  if (rawToken) {
    await prisma.$executeRaw`
      DELETE FROM "neon_auth"."session"
      WHERE "token" = ${rawToken}
    `.catch(() => {});
  }
  await clearAuthSessionCookies();
  return { success: true };
}

export async function requestPasswordRecovery(rawInput, ipKey = "anon") {
  const rate = await checkRateLimit(`forgot-pwd:${ipKey}`, {
    limit: 10,
    windowSeconds: 60
  });
  if (!rate.allowed) {
    throw new AppError(
      "Too many password recovery requests. Please wait a minute and try again.",
      429,
      "RATE_LIMITED"
    );
  }

  const { email } = forgotPasswordSchema.parse(rawInput);
  const env = getServerEnv();
  const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/forgot-password`;

  // Trigger Neon Auth's upstream password reset flow (non-blocking if shared provider restricts recipients)
  const auth = getNeonAuthServer();
  await auth
    .requestPasswordReset({
      email,
      redirectTo: redirectUrl
    })
    .catch(() => {});

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.active && !user.deletedAt) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.$transaction(async (tx) => {
      // Invalidate any older unused tokens for this user
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });
    });

    if (isEmailConfigured()) {
      try {
        const transporter = nodemailer.createTransport(env.EMAIL_SERVER);
        const resetLink = `${env.NEXT_PUBLIC_APP_URL}/forgot-password?token=${encodeURIComponent(rawToken)}`;
        await transporter.sendMail({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: "Aurena Nails — Reset Your Password",
          text: `Hello ${user.firstName},\n\nWe received a request to reset your Aurena Nails password.\nReset link (valid for 60 minutes): ${resetLink}\n\nIf you did not request this, you can safely ignore this email.`
        });
      } catch {
        // Do not leak email transport errors or cause account enumeration
      }
    }
  }

  return {
    success: true,
    message:
      "If an account with that email address exists, password recovery instructions have been sent."
  };
}

export async function resetPasswordWithToken(rawInput, ipKey = "anon") {
  const rate = await checkRateLimit(`reset-pwd:${ipKey}`, {
    limit: 10,
    windowSeconds: 60
  });
  if (!rate.allowed) {
    throw new AppError(
      "Too many reset attempts. Please wait a minute and try again.",
      429,
      "RATE_LIMITED"
    );
  }

  const { token, password } = resetPasswordSchema.parse(rawInput);
  const tokenHash = hashResetToken(token);
  const now = new Date();

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (resetRecord) {
    if (resetRecord.usedAt || resetRecord.expiresAt <= now) {
      throw new AppError(
        "This password reset link has expired or has already been used.",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    if (
      !resetRecord.user ||
      !resetRecord.user.active ||
      resetRecord.user.deletedAt
    ) {
      throw new AppError(
        "Unable to reset password for this account.",
        403,
        "ACCOUNT_INACTIVE"
      );
    }

    const scryptHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: now }
      });

      await tx.$executeRaw`
        UPDATE "neon_auth"."account"
        SET "password" = ${scryptHash}, "updatedAt" = NOW()
        WHERE "userId" = ${resetRecord.user.authId}::uuid AND "providerId" = 'credential'
      `;

      await tx.$executeRaw`
        DELETE FROM "neon_auth"."session"
        WHERE "userId" = ${resetRecord.user.authId}::uuid
      `;

      await createNotificationOnce(
        {
          userId: resetRecord.user.id,
          title: "Password Reset Successful",
          message: "Your Aurena Nails account password was securely updated.",
          eventKey: `password-reset:${resetRecord.id}`
        },
        tx
      );
    });

    return {
      success: true,
      message:
        "Your password has been reset successfully. You may now sign in."
    };
  }

  // Fallback to Neon Auth upstream reset token if token came directly from Neon Auth
  const auth = getNeonAuthServer();
  const { error } = await auth.resetPassword({
    token,
    newPassword: password
  });

  if (error) {
    throw new AppError(
      "This password reset link is invalid or has expired.",
      400,
      "INVALID_RESET_TOKEN"
    );
  }

  return {
    success: true,
    message: "Your password has been reset successfully. You may now sign in."
  };
}

export async function changeCustomerPassword(user, rawInput) {
  const normalizedInput = {
    currentPassword: rawInput?.currentPassword || "",
    newPassword: rawInput?.newPassword || "",
    confirmPassword:
      rawInput?.confirmPassword || rawInput?.confirmNewPassword || ""
  };
  const data = changePasswordSchema.parse(normalizedInput);
  const auth = getNeonAuthServer();

  const { error } = await auth.changePassword({
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
    revokeOtherSessions: false
  });

  if (error) {
    const accounts = await prisma.$queryRaw`
      SELECT "id", "password"
      FROM "neon_auth"."account"
      WHERE "userId" = ${user.authId}::uuid
        AND "providerId" = 'credential'
      LIMIT 1
    `;
    const account = accounts?.[0];
    if (!account?.password) {
      throw new AppError(
        error.message || "Current password is incorrect.",
        400,
        "PASSWORD_CHANGE_FAILED"
      );
    }

    const valid =
      verifyPassword.length >= 2
        ? await verifyPassword(account.password, data.currentPassword)
        : await verifyPassword({
            hash: account.password,
            password: data.currentPassword
          });
    if (!valid) {
      throw new AppError(
        "Current password is incorrect.",
        400,
        "PASSWORD_CHANGE_FAILED"
      );
    }

    const newHash = await hashPassword(data.newPassword);
    await prisma.$executeRaw`
      UPDATE "neon_auth"."account"
      SET "password" = ${newHash}, "updatedAt" = NOW()
      WHERE "id" = ${account.id}::uuid
    `;
  }

  await createNotificationOnce({
    userId: user.id,
    title: "Password Updated",
    message: "Your account password was changed successfully.",
    eventKey: `pwd-change:${user.id}:${Date.now()}`
  });

  return {
    success: true,
    message: "Your password has been updated successfully."
  };
}
