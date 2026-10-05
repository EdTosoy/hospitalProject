import { access, cp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = resolve(root, ".next/standalone/apps/frontend");
await access(resolve(app, "server.js"));
await cp(resolve(root, ".next/static"), resolve(app, ".next/static"), {
  recursive: true,
});
await cp(resolve(root, "public"), resolve(app, "public"), { recursive: true });
process.env.PORT ??= "3001";
process.env.HOSTNAME = "0.0.0.0";
await import(pathToFileURL(resolve(app, "server.js")).href);
