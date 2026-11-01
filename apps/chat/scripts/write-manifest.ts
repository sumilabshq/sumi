import fs from "node:fs";
import path from "node:path";
import { loadSumiApp } from "./sumi-app-loaded.ts";

const { APP_MANIFEST_FILE, manifest } = await loadSumiApp();

const at = path.join(import.meta.dirname, "..", APP_MANIFEST_FILE);
const written = `${JSON.stringify(manifest, null, "\t")}\n`;

if (!process.argv.includes("--check")) {
	fs.writeFileSync(at, written);
	console.log(`${APP_MANIFEST_FILE} written`);
	process.exit(0);
}

const held = fs.existsSync(at) ? fs.readFileSync(at, "utf8") : "";

if (held !== written) {
	console.error(`${APP_MANIFEST_FILE} is stale or missing: run pnpm manifest`);
	process.exit(1);
}

console.log(`${APP_MANIFEST_FILE} matches sumi-app.ts`);
