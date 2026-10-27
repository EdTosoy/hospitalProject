// Infrastructure adapter: no changes to application authentication/business code.
const fs = require("node:fs");
const path = require("node:path");

function secret(name) {
  const value = fs.readFileSync(`/run/secrets/${name}`, "utf8").trim();
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("Invalid runtime secret file");
  return value;
}

const target = process.argv[2];
if (![
  "dist/src/main.js",
  "dist/src/database/migrate.js",
  "dist/src/database/seed.js",
].includes(target)) throw new Error("Unsupported runtime command");

const database = process.env.DATABASE_NAME || "abox_demo";
if (!/^abox_(demo|restore_[0-9]{14})$/.test(database)) throw new Error("Refusing non-demo database");
if (process.env.DATABASE_HOST !== "database") throw new Error("Refusing external database");
process.env.DATABASE_URL = `postgresql://abox_app:${secret("app_password")}@database:5432/${database}`;

if (target === "dist/src/main.js") {
  if (process.env.NODE_ENV !== "production") throw new Error("Backend must run in production mode");
  process.env.JWT_SECRET = secret("jwt_secret");
}
if (target === "dist/src/database/seed.js") {
  if (process.env.ABOX_SYNTHETIC_DEMO_ONLY !== "true" || database !== "abox_demo") {
    throw new Error("Explicit synthetic-only initial seeding required");
  }
  process.env.SEED_PASSWORD = secret("demo_password");
}

require(path.resolve(process.cwd(), target));
