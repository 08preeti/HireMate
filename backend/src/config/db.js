import mongoose from "mongoose";
import { env } from "./env.js";
import { seedDevelopmentData } from "../services/devSeedService.js";

export const DEFAULT_DB_NAME = "HireMate";
// MongoDB's driver silently uses "test" when a connection string names no database. That name is reserved
// for the automated tests, so the app refuses to run against it.
const RESERVED_DB_NAMES = ["test"];

let memoryServerInstance = null;

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

  // In production, always require the real configured database
  if (env.isProduction) {
    await mongoose.connect(env.mongoUri, { dbName });
    const actual = mongoose.connection.name;
    if (actual !== dbName) {
      throw new Error(`Connected to database "${actual}" but expected "${dbName}"`);
    }
    console.log(`✅ MongoDB connected successfully — Database: ${actual}`);
    return;
  }

  // In development, attempt to connect to env.mongoUri with a short timeout.
  // If local MongoDB service is not running (ECONNREFUSED), fall back to embedded in-memory MongoDB.
  try {
    await mongoose.connect(env.mongoUri, {
      dbName,
      serverSelectionTimeoutMS: 2000,
    });
    const actual = mongoose.connection.name;
    console.log(`✅ MongoDB connected successfully — Database: ${actual}`);
  } catch (err) {
    const isConnRefused =
      err.name === "MongooseServerSelectionError" ||
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("connect");

    if (isConnRefused) {
      console.warn("⚠️ Local MongoDB service not reachable on localhost:27017.");
      console.log("⚡ Starting embedded development MongoDB engine (MongoMemoryServer)...");
      try {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        memoryServerInstance = await MongoMemoryServer.create({
          instance: { dbName },
        });
        const memoryUri = memoryServerInstance.getUri();
        await mongoose.connect(memoryUri, { dbName });
        console.log(`✅ Embedded development database connected at ${memoryUri}`);
        await seedDevelopmentData();
        return;
      } catch (memErr) {
        console.error("❌ Failed to start embedded development MongoDB:", memErr.message);
      }
    }
    throw err;
  }
}
