import { z } from "zod";

export const INDIAN_MOBILE_REGEX = /^(?:\+91[\-\s]?|91[\-\s]?|0)?([6-9]\d{9})$/;

export function normalizeIndianMobile(value) {
  if (!value || typeof value !== "string") return "";
  const cleaned = value.trim().replace(/[\s\-()]/g, "");
  const match = cleaned.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  return match ? match[1] : cleaned;
}

export function isValidIndianMobile(value) {
  if (!value || typeof value !== "string") return false;
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));
}

export const indianMobileSchema = z
  .string({ required_error: "Mobile number is required." })
  .trim()
  .min(1, "Mobile number is required.")
  .refine(isValidIndianMobile, {
    message: "Please enter a valid 10-digit Indian mobile number (starting with 6-9)."
  })
  .transform(normalizeIndianMobile);

export const passwordStrengthSchema = z
  .string({ required_error: "Password is required." })
  .min(8, "Password must be at least 8 characters long.")
  .max(128, "Password must not exceed 128 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const registerSchema = z
  .object({
    firstName: z
      .string({ required_error: "First name is required." })
      .trim()
      .min(2, "First name must be at least 2 characters.")
      .max(60, "First name is too long."),
    lastName: z
      .string({ required_error: "Last name is required." })
      .trim()
      .min(1, "Last name is required.")
      .max(60, "Last name is too long."),
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .min(1, "Email is required.")
      .email("Please enter a valid email address.")
      .transform((val) => val.toLowerCase()),
    mobile: indianMobileSchema,
    password: passwordStrengthSchema,
    confirmPassword: z
      .string({ required_error: "Please confirm your password." })
      .min(1, "Please confirm your password."),
    image: z.string().optional().nullable()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Email or mobile number is required." })
    .trim()
    .min(1, "Email or mobile number is required."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required."),
  rememberMe: z.boolean().optional().default(true)
});

export const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters.")
    .max(60, "First name is too long."),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(60, "Last name is too long."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .transform((val) => val.toLowerCase()),
  mobile: indianMobileSchema,
  image: z.string().optional().nullable()
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordStrengthSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password.")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"]
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .email("Please enter a valid email address.")
    .transform((val) => val.toLowerCase())
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(8, "Invalid or missing reset token."),
    password: passwordStrengthSchema,
    confirmPassword: z.string().min(1, "Please confirm your password.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const bookingSchema = z.object({
  serviceId: z.string().trim().min(1, "Please select a service."),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a valid date (YYYY-MM-DD)."),
  time: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Please select a valid time slot (HH:MM)."),
  note: z
    .string()
    .trim()
    .max(500, "Note must be 500 characters or fewer.")
    .optional()
    .default(""),
  requestKey: z.string().trim().optional()
});

export const reviewSchema = z.object({
  appointmentId: z.string().trim().min(1, "Eligible completed appointment is required."),
  serviceId: z.string().trim().min(1, "Service is required."),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5.")
    .max(5, "Rating must be between 1 and 5."),
  comment: z
    .string()
    .trim()
    .min(5, "Please share at least 5 characters in your review.")
    .max(1000, "Review must be 1000 characters or fewer.")
});

export const reviewUpdateSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5.")
    .max(5, "Rating must be between 1 and 5."),
  comment: z
    .string()
    .trim()
    .min(5, "Please share at least 5 characters in your review.")
    .max(1000, "Review must be 1000 characters or fewer.")
});

export const contactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 characters).")
    .max(100, "Name is too long."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .transform((val) => val.toLowerCase()),
  mobile: indianMobileSchema,
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters.")
    .max(160, "Subject is too long."),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(2000, "Message is too long.")
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required.").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain lowercase letters, numbers, and hyphens only.")
    .optional(),
  shortDescription: z.string().trim().min(5, "Short description is required.").max(300),
  description: z.string().trim().min(10, "Full description is required.").max(5000),
  categoryId: z.string().trim().optional().nullable(),
  mainImage: z.string().trim().optional().nullable(),
  duration: z.coerce
    .number()
    .int()
    .min(15, "Duration must be at least 15 minutes.")
    .max(480, "Duration cannot exceed 480 minutes."),
  startingPrice: z.coerce
    .number()
    .min(0, "Starting price must be 0 or greater."),
  regularPrice: z
    .union([z.coerce.number().min(0), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === undefined ? null : v)),
  promotionalPrice: z
    .union([z.coerce.number().min(0), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === undefined ? null : v)),
  nailType: z.string().trim().optional().default(""),
  style: z.string().trim().optional().default(""),
  occasion: z.string().trim().optional().default(""),
  difficulty: z.string().trim().optional().default(""),
  preparation: z.string().trim().optional().default(""),
  aftercare: z.string().trim().optional().default(""),
  available: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        publicId: z.string().optional().nullable(),
        alt: z.string().optional().default(""),
        position: z.number().int().optional().default(0),
        metadata: z.any().optional().nullable()
      })
    )
    .optional(),
  videoIds: z.array(z.string()).optional()
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format.")
    .optional(),
  description: z.string().trim().max(500).optional().default(""),
  image: z.string().trim().optional().nullable(),
  active: z.boolean().optional().default(true)
});

export const galleryImageSchema = z.object({
  title: z.string().trim().min(2, "Title is required.").max(140),
  description: z.string().trim().max(1000).optional().default(""),
  url: z.string().trim().min(1, "Image URL is required."),
  publicId: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  tags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }),
  style: z.string().trim().optional().default(""),
  occasion: z.string().trim().optional().default(""),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  position: z.coerce.number().int().optional().default(0),
  metadata: z.any().optional().nullable()
});

export const videoSchema = z.object({
  title: z.string().trim().min(2, "Video title is required.").max(140),
  description: z.string().trim().max(1000).optional().default(""),
  url: z.string().trim().min(1, "Video URL is required."),
  publicId: z.string().trim().optional().nullable(),
  thumbnail: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  tags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  metadata: z.any().optional().nullable()
});

export const businessHoursItemSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/, "Opening time must be HH:MM"),
  close: z.string().regex(/^\d{2}:\d{2}$/, "Closing time must be HH:MM"),
  closed: z.boolean()
});

export const holidaySchema = z.object({
  name: z.string().trim().min(2, "Holiday name is required.").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().trim().max(500).optional().default(""),
  active: z.boolean().optional().default(true)
});
