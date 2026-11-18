import mongoose from "mongoose";
import { env } from "./env.js";

export const DEFAULT_DB_NAME = "HireMate";
// MongoDB's driver silently uses "test" when a connection string names no database. That name is reserved
// for the automated tests, so the app refuses to run against it.
const RESERVED_DB_NAMES = ["test"];

/** The database named in a connection string (the part after the host and before "?"), or "" if there is none. */
export function dbNameFromUri(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/?]*\/([^?]*)/.exec(
    String(uri ?? "").trim(),
  );
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Which database the app uses: MONGODB_DB_NAME, else the name in MONGODB_URI, else "HireMate". Never "test". */
export function resolveDbName(uri = env.mongoUri, explicit = env.mongoDbName) {
  const name = (explicit || "").trim() || dbNameFromUri(uri) || DEFAULT_DB_NAME;
  if (RESERVED_DB_NAMES.includes(name.toLowerCase())) {
    throw new Error(
      `Database "${name}" is reserved for automated tests. Use ${DEFAULT_DB_NAME} (set MONGODB_DB_NAME=${DEFAULT_DB_NAME} or put /${DEFAULT_DB_NAME} in MONGODB_URI).`,
    );
  }
  return name;
}

export async function connectDB() {
  const dbName = resolveDbName();
  // dbName is passed explicitly so a connection string without a database can never fall back to "test".
  await mongoose.connect(env.mongoUri, { dbName });
  // Report the database Mongoose is really using, and stop if it is not the one we asked for.
  const actual = mongoose.connection.name;
  if (actual !== dbName)
    throw new Error(
      `Connected to database "${actual}" but expected "${dbName}"`,
    );
  console.log(`✅ MongoDB connected successfully — Database: ${actual}`);
}
