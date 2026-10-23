import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { layStudioSheets } from "./lay-studio-sheets.mts";
import { REPO } from "./pack-engine.mts";

const PREVIEW_APP = path.join(REPO, ".preview/default-app");
const LEFT_OUT_OF_DEMO: ReadonlySet<string> = new Set(["node_modules", ".omc"]);
const LEFT_OUT_OF_LINKS: ReadonlySet<string> = new Set([".bin", ".package-lock.json"]);
const TAURI_CONFIG = path.join(REPO, "packages/host-tauri/vite.tauri.config.ts");
const DEMO_VITE = "node_modules/vite/bin/vite.js";
const SHIPPED_ASSETS = path.join(REPO, "packages/host-tauri/dist/assets");
const SHEET = /\.css$/;

export const TAURI_DEMO = path.join(tmpdir(), "wg-tauri-demo");

export async function tauriFrontendSheet(): Promise<string> {
	await layStudioSheets();
	layTauriDemo(TAURI_DEMO);
	const outDir = fs.mkdtempSync(path.join(tmpdir(), "wg-tauri-frontend-"));
	try {
		execFileSync(
			process.execPath,
			[
				"--conditions=source",
				"--import",
				"tsx",
				DEMO_VITE,
				"build",
				"--mode",
				"studio",
				"--configLoader",
				"native",
				"--config",
				TAURI_CONFIG,
				"--outDir",
				outDir,
				"--emptyOutDir",
				"--logLevel",
				"error",
			],
			{
				cwd: TAURI_DEMO,
				stdio: ["ignore", "ignore", "inherit"],
			},
		);
		return sheetIn(path.join(outDir, "assets"));
	} finally {
		fs.rmSync(outDir, { recursive: true, force: true });
	}
}

export function shippedTauriSheet(): string {
	return sheetIn(SHIPPED_ASSETS);
}

function sheetIn(assets: string): string {
	const found = fs.readdirSync(assets).filter((name) => SHEET.test(name));
	if (found.length !== 1) {
		throw new Error(`${assets} holds ${found.length} sheets, the Tauri build writes one`);
	}

	return fs.readFileSync(path.join(assets, found[0] ?? ""), "utf8");
}

function layTauriDemo(demo: string): void {
	if (fs.existsSync(path.join(demo, DEMO_VITE))) {
		return;
	}

	fs.rmSync(demo, { recursive: true, force: true });
	fs.mkdirSync(demo, { recursive: true });
	for (const entry of fs.readdirSync(PREVIEW_APP)) {
		if (!LEFT_OUT_OF_DEMO.has(entry)) {
			fs.cpSync(path.join(PREVIEW_APP, entry), path.join(demo, entry), { recursive: true });
		}
	}

	const modules = path.join(demo, "node_modules");
	linkModules(path.join(REPO, "node_modules"), modules);
	linkModules(path.join(PREVIEW_APP, "node_modules"), modules);
	const kit = path.join(demo, "src/shared/kit");
	fs.rmSync(kit, { recursive: true, force: true });
	fs.symlinkSync(path.join(REPO, "packages/kit/src"), kit);
	withoutKitAliases(path.join(demo, "widgetarium.json"));
}

function linkModules(from: string, into: string): void {
	fs.mkdirSync(into, { recursive: true });
	for (const entry of fs.readdirSync(from)) {
		if (LEFT_OUT_OF_LINKS.has(entry)) {
			continue;
		}

		if (entry.startsWith("@")) {
			linkModules(path.join(from, entry), path.join(into, entry));
			continue;
		}

		const at = path.join(into, entry);
		if (!fs.existsSync(at)) {
			fs.symlinkSync(path.join(from, entry), at);
		}
	}
}

function withoutKitAliases(configAt: string): void {
	const { aliases: _dropped, ...config }: Record<string, unknown> = JSON.parse(fs.readFileSync(configAt, "utf8"));
	fs.writeFileSync(configAt, `${JSON.stringify(config, null, "\t")}\n`);
}
