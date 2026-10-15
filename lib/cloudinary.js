import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { getServerEnv, isCloudinaryConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function configureCloudinaryClient() {
  if (!isCloudinaryConfigured()) return false;
  const env = getServerEnv();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
  return true;
}

/**
 * Inspects file magic bytes to verify real file signature on the server.
 * Never trusts file extension or client MIME header alone.
 */
export function detectMediaSignature(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { resourceType: "image", mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { resourceType: "image", mime: "image/png", ext: "png" };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { resourceType: "image", mime: "image/webp", ext: "webp" };
  }

  // WEBM / Matroska: 1A 45 DF A3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { resourceType: "video", mime: "video/webm", ext: "webm" };
  }

  // MP4 / MOV: "ftyp" at offset 4, or "moov" / "wide" / "mdat"
  const boxType = buffer.subarray(4, 8).toString("ascii");
  if (boxType === "ftyp" || boxType === "moov" || boxType === "wide" || boxType === "mdat") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "qt  ") {
      return { resourceType: "video", mime: "video/quicktime", ext: "mov" };
    }
    return { resourceType: "video", mime: "video/mp4", ext: "mp4" };
  }

  return null;
}

export function validateMediaFile({ buffer, filename, declaredMime, expectedType }) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  const detected = detectMediaSignature(buffer);
  if (!detected) {
    throw new Error(
      "Unsupported or invalid file format. Allowed images: JPG, PNG, WEBP. Allowed videos: MP4, WEBM, MOV."
    );
  }

  if (expectedType && detected.resourceType !== expectedType) {
    throw new Error(
      `Expected a ${expectedType} file, but received a ${detected.resourceType} file.`
    );
  }

  if (detected.resourceType === "image") {
    if (!ALLOWED_IMAGE_MIMES.has(detected.mime)) {
      throw new Error("Unsupported image format. Only JPG, PNG, and WEBP are allowed.");
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error("Image file size exceeds the 10 MB limit.");
    }
  } else if (detected.resourceType === "video") {
    if (!ALLOWED_VIDEO_MIMES.has(detected.mime)) {
      throw new Error("Unsupported video format. Only MP4, WEBM, and MOV are allowed.");
    }
    if (buffer.length > MAX_VIDEO_BYTES) {
      throw new Error("Video file size exceeds the 50 MB limit.");
    }
  }

  return {
    ...detected,
    bytes: buffer.length,
    safeFilename: (filename || `upload.${detected.ext}`).replace(/[^a-zA-Z0-9._-]/g, "_")
  };
}

export function generateSignedUploadParams({ folder = "aurena-nails", resourceType = "image" }) {
  if (!configureCloudinaryClient()) {
    return {
      configured: false,
      mode: "server-upload",
      message: "Cloudinary credentials are not configured; using server-side upload endpoint."
    };
  }
  const env = getServerEnv();
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.CLOUDINARY_API_SECRET
  );

  return {
    configured: true,
    mode: "cloudinary-signed",
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    resourceType,
    signature
  };
}

export async function uploadMediaBuffer({
  buffer,
  filename,
  declaredMime,
  expectedType,
  folder = "aurena-nails",
  ownerId
}) {
  const validated = validateMediaFile({
    buffer,
    filename,
    declaredMime,
    expectedType
  });

  let uploadResult = null;

  if (configureCloudinaryClient()) {
    uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: validated.resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });
  } else {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const publicId = `${folder}/${uniqueSuffix}`;
    const fileNameOnDisk = `${uniqueSuffix}.${validated.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileNameOnDisk), buffer);

    uploadResult = {
      public_id: publicId,
      secure_url: `/uploads/${fileNameOnDisk}`,
      resource_type: validated.resourceType,
      bytes: validated.bytes,
      width: validated.resourceType === "image" ? 1200 : null,
      height: validated.resourceType === "image" ? 1200 : null,
      duration: validated.resourceType === "video" ? 15.0 : null,
      format: validated.ext
    };
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      resourceType: validated.resourceType,
      filename: validated.safeFilename,
      mime: validated.mime,
      bytes: Number(uploadResult.bytes || validated.bytes),
      width: uploadResult.width ? Number(uploadResult.width) : null,
      height: uploadResult.height ? Number(uploadResult.height) : null,
      duration: uploadResult.duration ? Number(uploadResult.duration) : null,
      ownerId: ownerId || "system"
    }
  });

  return {
    id: asset.id,
    url: asset.url,
    publicId: asset.publicId,
    resourceType: asset.resourceType,
    filename: asset.filename,
    mime: asset.mime,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    createdAt: asset.createdAt
  };
}

export async function deleteMediaByPublicId(publicId, resourceType = "image") {
  if (!publicId) return { deleted: false };

  if (configureCloudinaryClient()) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch {
      // Proceed with DB cleanup even if remote asset is already missing
    }
  } else {
    const existing = await prisma.mediaAsset.findUnique({ where: { publicId } });
    if (existing?.url?.startsWith("/uploads/")) {
      const diskPath = path.join(process.cwd(), "public", existing.url);
      await fs.unlink(diskPath).catch(() => {});
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.mediaAsset.deleteMany({ where: { publicId } });
    await tx.mediaDeletion.upsert({
      where: { publicId },
      update: { resourceType },
      create: { publicId, resourceType }
    });
  });

  return { deleted: true, publicId };
}
