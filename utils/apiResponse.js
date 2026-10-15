import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/auth";

export function jsonSuccess(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleApiError(error, fallbackMessage = "Something went wrong. Please try again.") {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const fieldErrors = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return NextResponse.json(
      {
        error: firstIssue ? firstIssue.message : "Validation failed. Please check your input.",
        code: "VALIDATION_ERROR",
        fieldErrors
      },
      { status: 400 }
    );
  }

  // Handle Prisma unique constraint & exclusion constraint errors gracefully without leaking SQL
  if (error?.code === "P2002") {
    const target = Array.isArray(error?.meta?.target)
      ? error.meta.target.join(", ")
      : String(error?.meta?.target || "");
    if (target.includes("email")) {
      return NextResponse.json(
        { error: "An account with this email address already exists.", code: "DUPLICATE_EMAIL" },
        { status: 409 }
      );
    }
    if (target.includes("mobile")) {
      return NextResponse.json(
        { error: "An account with this mobile number already exists.", code: "DUPLICATE_MOBILE" },
        { status: 409 }
      );
    }
    if (target.includes("slug")) {
      return NextResponse.json(
        { error: "A record with this slug already exists.", code: "DUPLICATE_SLUG" },
        { status: 409 }
      );
    }
    if (target.includes("date")) {
      return NextResponse.json(
        { error: "A holiday is already configured for this date.", code: "DUPLICATE_DATE" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "This record already exists.", code: "DUPLICATE_RECORD" },
      { status: 409 }
    );
  }

  if (error?.code === "P2003") {
    return NextResponse.json(
      {
        error: "This record cannot be deleted because it is referenced by existing salon records.",
        code: "FOREIGN_KEY_CONSTRAINT"
      },
      { status: 409 }
    );
  }

  const msg = String(error?.message || "");
  if (msg.includes("appointment_no_overlap") || msg.includes("23P01")) {
    return NextResponse.json(
      {
        error: "This time slot was just booked by another customer. Please choose another available time.",
        code: "SLOT_UNAVAILABLE"
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      error: fallbackMessage,
      code: "INTERNAL_ERROR"
    },
    { status: 500 }
  );
}
