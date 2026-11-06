import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const PROJECT_VARIABLE = "WIDGETARIUM_PROJECT";
const BUNDLED_PROJECT = path.join(import.meta.dirname, "project");
const PROJECT_VITE = "node_modules/vite/bin/vite.js";
const TAURI_CONFIG = path.join(import.meta.dirname, "vite.tauri.config.ts");
const REPO = path.resolve(import.meta.dirname, "../..");
const SHEETS_LAYER = "tools/lay-studio-sheets.mts";
const TOOL_LOADER = "./tools/loader/register.mts";

export function runProjectVite(command: readonly string[]): number {
	const project = process.env[PROJECT_VARIABLE] ?? BUNDLED_PROJECT;
	const laid = spawnSync(process.execPath, ["--single-threaded", "--import", TOOL_LOADER, SHEETS_LAYER], {
		cwd: REPO,
		stdio: "inherit",
		env: process.env,
	});

	if (laid.status !== 0) {
		return laid.status ?? 1;
	}

	const ran = spawnSync(
		process.execPath,
		[
			"--conditions=source",
			"--import",
			"tsx",
			viteOf(project),
			...command,
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
	return ran.status ?? 1;
}

function viteOf(project: string): string {
	const own = path.join(project, PROJECT_VITE);
	return existsSync(own) ? own : path.join(REPO, PROJECT_VITE);
}
