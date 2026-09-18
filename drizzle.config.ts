import { defineConfig } from "drizzle-kit";

/**
 * Credentials come from the environment only — nothing secret lives in the repo.
 * Local:  DATABASE_URL from .env.local
 * CI/Vercel: DATABASE_URL from the project environment variables
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
