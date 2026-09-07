/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma 7 talks to Postgres through node-postgres; keep both out of the
  // bundler so the native driver is required at runtime instead of traced.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs"],
};

export default nextConfig;
