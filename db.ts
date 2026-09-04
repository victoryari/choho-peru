import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbHost = process.env.DB_HOST || process.env.HOST || "localhost";
const dbUser = process.env.DB_USER || process.env.USERNAME || "root";
const dbPassword = process.env.DB_PASSWORD || process.env.PASSWORD || "";
const dbName = process.env.DB_NAME || process.env.DATABASE || "choho_peru";
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : (process.env.PORT === "4000" ? 4000 : 3306);

const isRemoteDb = Boolean(dbHost && dbHost !== "localhost" && dbHost !== "127.0.0.1");
export const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  ssl: (process.env.DB_SSL === "true" || isRemoteDb) ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
