import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__aurenaPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__aurenaPrisma = prisma;
}

export function serializeService(service) {
  if (!service) return null;
  return {
    ...service,
    startingPrice:
      service.startingPrice !== null && service.startingPrice !== undefined
        ? Number(service.startingPrice)
        : 0,
    regularPrice:
      service.regularPrice !== null && service.regularPrice !== undefined
        ? Number(service.regularPrice)
        : null,
    promotionalPrice:
      service.promotionalPrice !== null && service.promotionalPrice !== undefined
        ? Number(service.promotionalPrice)
        : null
  };
}
