#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const nextPkg = path.join(projectRoot, "node_modules", "next", "package.json");

if (fs.existsSync(nextPkg)) {
  process.exit(0);
}

console.log("[ensure-deps] node_modules missing, running npm ci...");
const result = spawnSync("npm", ["ci"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
