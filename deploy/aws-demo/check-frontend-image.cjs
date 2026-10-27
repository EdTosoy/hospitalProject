// Run inside the production image from /app/apps/frontend. No network or DB.
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");

async function main() {
  const expectedArch = process.argv[2] || "arm64";
  assert.ok(["arm64", "x64"].includes(expectedArch), "Unsupported probe architecture");
  assert.equal(process.arch, expectedArch, "Unexpected image architecture");
  // Sharp is Next's dependency, not a direct frontend dependency. pnpm preserves
  // that boundary in standalone output; use the same resolution context as Next.
  const nextRequire = createRequire(require.resolve("next/package.json"));
  const sharp = nextRequire("sharp");
  const png = await sharp({
    create: { width: 1, height: 1, channels: 4, background: "#00ada7" },
  }).png().toBuffer();
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1);
  assert.equal(metadata.height, 1);
  console.log(`${expectedArch} frontend Sharp encode/decode passed`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
