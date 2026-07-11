const fs = require("fs");
const path = require("path");

const envName = process.argv[2];
const allowed = new Set(["mock", "local", "development", "production"]);

if (!allowed.has(envName)) {
  console.error("Usage: node scripts/sync-env.js <mock|local|development|production>");
  process.exit(1);
}

const source = path.resolve(process.cwd(), `.env.${envName}`);
const target = path.resolve(process.cwd(), ".env");

if (!fs.existsSync(source)) {
  console.error(`Missing env file: .env.${envName}`);
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`Copied .env.${envName} -> .env`);
