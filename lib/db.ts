import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sslMode = process.env.DATABASE_SSL?.trim().toLowerCase();
const useSsl = sslMode
  ? !["false", "disable", "off", "0"].includes(sslMode)
  : !/^(postgres(?:ql)?:\/\/)?(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::|\/)/i.test(
      connectionString,
    );

const configuredMax = Number(process.env.DATABASE_POOL_MAX ?? 10);

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  application_name: "omega",
  max: Number.isInteger(configuredMax) && configuredMax > 0 ? configuredMax : 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});
