-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "aurena";

-- CreateEnum
CREATE TYPE "aurena"."Role" AS ENUM ('ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "aurena"."AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "aurena"."User" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT,
    "image" TEXT,
    "role" "aurena"."Role" NOT NULL DEFAULT 'CUSTOMER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."GalleryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "mainImage" TEXT,
    "duration" INTEGER NOT NULL,
    "startingPrice" DECIMAL(10,2) NOT NULL,
    "regularPrice" DECIMAL(10,2),
    "promotionalPrice" DECIMAL(10,2),
    "nailType" TEXT NOT NULL DEFAULT '',
    "style" TEXT NOT NULL DEFAULT '',
    "occasion" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT '',
    "preparation" TEXT NOT NULL DEFAULT '',
    "aftercare" TEXT NOT NULL DEFAULT '',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."ServiceImage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "alt" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."ServiceVideo" (
    "serviceId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,

    CONSTRAINT "ServiceVideo_pkey" PRIMARY KEY ("serviceId","videoId")
);

-- CreateTable
CREATE TABLE "aurena"."GalleryImage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "categoryId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "style" TEXT NOT NULL DEFAULT '',
    "occasion" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "thumbnail" TEXT,
    "categoryId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "start" TIMESTAMPTZ(3) NOT NULL,
    "end" TIMESTAMPTZ(3) NOT NULL,
    "status" "aurena"."AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL DEFAULT '',
    "requestKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT,
    "galleryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."Review" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "eventKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."WebsiteContent" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteContent_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "aurena"."BusinessHours" (
    "weekday" INTEGER NOT NULL,
    "open" TEXT NOT NULL,
    "close" TEXT NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("weekday")
);

-- CreateTable
CREATE TABLE "aurena"."Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."MediaAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."MediaDeletion" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aurena"."RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "aurena"."User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "aurena"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "aurena"."User"("mobile");

-- CreateIndex
CREATE INDEX "User_role_active_createdAt_idx" ON "aurena"."User"("role", "active", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "aurena"."PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "aurena"."PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryCategory_slug_key" ON "aurena"."GalleryCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "aurena"."Service"("slug");

-- CreateIndex
CREATE INDEX "Service_active_featured_categoryId_idx" ON "aurena"."Service"("active", "featured", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceImage_publicId_key" ON "aurena"."ServiceImage"("publicId");

-- CreateIndex
CREATE INDEX "ServiceImage_serviceId_position_idx" ON "aurena"."ServiceImage"("serviceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryImage_publicId_key" ON "aurena"."GalleryImage"("publicId");

-- CreateIndex
CREATE INDEX "GalleryImage_active_categoryId_createdAt_idx" ON "aurena"."GalleryImage"("active", "categoryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Video_publicId_key" ON "aurena"."Video"("publicId");

-- CreateIndex
CREATE INDEX "Video_active_categoryId_createdAt_idx" ON "aurena"."Video"("active", "categoryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_requestKey_key" ON "aurena"."Appointment"("requestKey");

-- CreateIndex
CREATE INDEX "Appointment_status_start_end_idx" ON "aurena"."Appointment"("status", "start", "end");

-- CreateIndex
CREATE INDEX "Appointment_userId_start_idx" ON "aurena"."Appointment"("userId", "start");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_galleryId_key" ON "aurena"."Wishlist"("userId", "galleryId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_serviceId_key" ON "aurena"."Wishlist"("userId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "aurena"."Review"("appointmentId");

-- CreateIndex
CREATE INDEX "Review_serviceId_visible_idx" ON "aurena"."Review"("serviceId", "visible");

-- CreateIndex
CREATE INDEX "ContactMessage_read_createdAt_idx" ON "aurena"."ContactMessage"("read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_eventKey_key" ON "aurena"."Notification"("eventKey");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "aurena"."Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "aurena"."Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "aurena"."MediaAsset"("publicId");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerId_idx" ON "aurena"."MediaAsset"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaDeletion_publicId_key" ON "aurena"."MediaDeletion"("publicId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "aurena"."AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "aurena"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "aurena"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "aurena"."GalleryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."ServiceImage" ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "aurena"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."ServiceVideo" ADD CONSTRAINT "ServiceVideo_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "aurena"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."ServiceVideo" ADD CONSTRAINT "ServiceVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "aurena"."Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."GalleryImage" ADD CONSTRAINT "GalleryImage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "aurena"."GalleryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Video" ADD CONSTRAINT "Video_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "aurena"."GalleryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "aurena"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "aurena"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Wishlist" ADD CONSTRAINT "Wishlist_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "aurena"."GalleryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Wishlist" ADD CONSTRAINT "Wishlist_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "aurena"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "aurena"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Review" ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "aurena"."Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "aurena"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "aurena"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aurena"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "aurena"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Domain Check & Exclusion Constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "aurena"."Appointment"
  ADD CONSTRAINT "appointment_positive_duration" CHECK ("end" > "start");

ALTER TABLE "aurena"."Appointment"
  ADD CONSTRAINT "appointment_no_overlap" EXCLUDE USING gist (
    tstzrange("start", "end", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING'::"aurena"."AppointmentStatus", 'CONFIRMED'::"aurena"."AppointmentStatus"));

ALTER TABLE "aurena"."BusinessHours"
  ADD CONSTRAINT "weekday_range" CHECK ("weekday" >= 0 AND "weekday" <= 6);

ALTER TABLE "aurena"."Review"
  ADD CONSTRAINT "review_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

ALTER TABLE "aurena"."Service"
  ADD CONSTRAINT "service_duration_price" CHECK ("duration" >= 15 AND "duration" <= 480 AND "startingPrice" >= 0);

ALTER TABLE "aurena"."Wishlist"
  ADD CONSTRAINT "wishlist_exactly_one_target" CHECK (("serviceId" IS NULL) <> ("galleryId" IS NULL));
