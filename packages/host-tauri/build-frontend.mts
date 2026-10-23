import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const PROJECT_VARIABLE = "WIDGETARIUM_PROJECT";
const PROJECT_VITE = "node_modules/vite/bin/vite.js";
const TAURI_CONFIG = path.join(import.meta.dirname, "vite.tauri.config.ts");
const NO_PROJECT = `set ${PROJECT_VARIABLE} to the Widgetarium project the window draws, e.g. ${PROJECT_VARIABLE}=~/apps/farm npm run build`;
const NO_VITE = "{project} has no {vite}: run npm install there first";

const project = process.env[PROJECT_VARIABLE];
if (!project) {
	console.error(NO_PROJECT);
	process.exit(1);
}

if (!existsSync(path.join(project, PROJECT_VITE))) {
	console.error(NO_VITE.replace("{project}", project).replace("{vite}", PROJECT_VITE));
	process.exit(1);
}

const built = spawnSync(
	process.execPath,
	[
		"--conditions=source",
		"--import",
		"tsx",
		PROJECT_VITE,
		"build",
		"--mode",
		"studio",
		"--configLoader",
		"native",
		"--config",
		TAURI_CONFIG,
	],
	{
		cwd: project,
		stdio: "inherit",
		env: process.env,
	},
);
process.exit(built.status ?? 1);
