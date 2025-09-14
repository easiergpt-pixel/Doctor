/**
 * Minimal DB bootstrap to avoid crashing when DATABASE_URL is not set.
 * Replace with real Neon + Drizzle setup as needed.
 */
export function getDb() {
  const url = process.env.DATABASE_URL || "";
  return { url };
}
