import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 keeps connection URLs out of schema.prisma — the CLI reads them
 * from here, and the app passes a driver adapter to PrismaClient (see
 * src/lib/prisma.ts).
 *
 * DATABASE_URL points at Neon's pooled (-pooler) host, which is right for the
 * app and for `prisma db push`. `prisma migrate` wants a direct connection:
 * set DIRECT_URL to the unpooled host and it is used automatically below.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    // Prefer the unpooled host for schema work when it is configured; the app
    // itself always uses DATABASE_URL (the pooled one).
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});
