import test from "node:test";
import assert from "node:assert/strict";

process.env.MONGODB_URI ||= "mongodb://localhost:27017/unused";
process.env.JWT_SECRET ||= "test-secret";
const { dbNameFromUri, resolveDbName, DEFAULT_DB_NAME } = await import("../src/config/db.js");

test("reads the database name from the connection string", () => {
  assert.equal(dbNameFromUri("mongodb://localhost:27017/HireMate"), "HireMate");
  assert.equal(dbNameFromUri("mongodb+srv://u:p@cluster0.abc.mongodb.net/HireMate?retryWrites=true&w=majority"), "HireMate");
  assert.equal(dbNameFromUri("mongodb://a:27017,b:27017,c:27017/HireMate?replicaSet=rs0"), "HireMate");
});

test("a connection string without a database name gives an empty name", () => {
  assert.equal(dbNameFromUri("mongodb+srv://u:p@cluster0.abc.mongodb.net/?appName=HireMate"), "");
  assert.equal(dbNameFromUri("mongodb+srv://u:p@cluster0.abc.mongodb.net"), "");
  assert.equal(dbNameFromUri("mongodb://localhost:27017/?retryWrites=true"), "");
});

test("without a database in the URI the app uses HireMate, never the driver's default 'test'", () => {
  assert.equal(resolveDbName("mongodb+srv://u:p@cluster0.abc.mongodb.net/?appName=x", ""), DEFAULT_DB_NAME);
  assert.equal(DEFAULT_DB_NAME, "HireMate");
});

test("MONGODB_DB_NAME wins over the URI, and the URI wins over the default", () => {
  assert.equal(resolveDbName("mongodb://localhost/Other", "HireMate"), "HireMate");
  assert.equal(resolveDbName("mongodb://localhost/Staging", ""), "Staging");
});

test("the reserved test database is refused for the app", () => {
  assert.throws(() => resolveDbName("mongodb://localhost/test", ""), /reserved for automated tests/);
  assert.throws(() => resolveDbName("mongodb://localhost/HireMate", "Test"), /reserved for automated tests/);
});
