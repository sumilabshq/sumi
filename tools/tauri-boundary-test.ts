import fs from "node:fs";
import path from "node:path";
import { tauriImportRefusal, tauriOnlyInHost } from "../apps/tauri/tauri-reach.mts";
import { check, tally, thrownBy } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const HOST = path.join(REPO, "apps", "tauri");
const ANY_FOLDER = "/*";
const TAURI_PACKAGES = "@tauri-apps/";
const TAURI_GLOBAL = "__TAURI";
const ONLY_HOST = "only apps/tauri reaches Tauri";
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"]);
const SKIPPED_FOLDERS = ["node_modules", "dist", "target"].map((name) => `${path.sep}${name}${path.sep}`);
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

function guardedPackages(): readonly string[] {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
	const patterns: unknown =
		typeof manifest === "object" && manifest !== null ? Reflect.get(manifest, "workspaces") : [];
	return (Array.isArray(patterns) ? patterns : [])
		.filter((pattern): pattern is string => typeof pattern === "string" && pattern.endsWith(ANY_FOLDER))
		.flatMap((pattern) => foldersIn(path.join(REPO, pattern.slice(0, -ANY_FOLDER.length))))
		.filter((folder) => fs.existsSync(path.join(folder, "package.json")))
		.filter((folder) => folder !== HOST && !folder.startsWith(HOST + path.sep));
}

function foldersIn(parent: string): readonly string[] {
	return fs
		.readdirSync(parent, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(parent, entry.name));
}

function sourceFilesIn(folder: string): readonly string[] {
	return fs
		.readdirSync(folder, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name)))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => !SKIPPED_FOLDERS.some((skipped) => file.includes(skipped)));
}

function declaredTauriOf(folder: string): readonly string[] {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));

	if (typeof manifest !== "object" || manifest === null) {
		return [];
	}

	return DEPENDENCY_FIELDS.flatMap((field) => {
		const listed: unknown = Reflect.get(manifest, field);
		return typeof listed === "object" && listed !== null
			? Object.keys(listed)
					.filter((name) => name.startsWith(TAURI_PACKAGES))
					.map((name) => `${path.relative(REPO, folder)}: ${name}`)
			: [];
	});
}

function tauriReachingFilesIn(folder: string): readonly string[] {
	return sourceFilesIn(folder)
		.filter((file) => {
			const text = fs.readFileSync(file, "utf8");
			return text.includes(TAURI_PACKAGES) || text.includes(TAURI_GLOBAL);
		})
		.map((file) => path.relative(REPO, file));
}

const guarded = guardedPackages();
check(
	"every workspace package but the host is guarded, plugins included",
	[guarded.length > 20, guarded.some((folder) => folder.includes(`${path.sep}plugins${path.sep}`))],
	[true, true],
);
check(
	"no package outside apps/tauri declares a Tauri package",
	guarded.flatMap((folder) => declaredTauriOf(folder)),
	[],
);
check(
	"no file outside apps/tauri imports Tauri or reaches its global",
	guarded.flatMap((folder) => tauriReachingFilesIn(folder)),
	[],
);

const pluginFile = path.join(REPO, "plugins/main/src/index.ts");
const hostFile = path.join(REPO, "apps/tauri/src/start-tauri-studio.ts");
const capabilityFile = path.join(REPO, "apps/tauri/capabilities/terminal/module.ts");
check(
	"the rule refuses Tauri everywhere but the host and lets the host and its capabilities through",
	[
		tauriImportRefusal("@tauri-apps/api/core", pluginFile)?.includes(ONLY_HOST) ?? false,
		tauriImportRefusal("@tauri-apps/api/core", path.join(REPO, "packages/state/layout/module.ts"))?.includes(
			ONLY_HOST,
		) ?? false,
		tauriImportRefusal("@tauri-apps/api/core", hostFile),
		tauriImportRefusal("@tauri-apps/api/core", capabilityFile),
		tauriImportRefusal("@sumi/contract", pluginFile),
	],
	[true, true, null, null, null],
);

const viteRefusal = thrownBy(() =>
	tauriOnlyInHost.resolveId.call(
		{
			error: (message: string): never => {
				throw new Error(message);
			},
		},
		"@tauri-apps/api/event",
		pluginFile,
	),
);
check("the host's Vite build fails a plugin importing Tauri", viteRefusal.includes(ONLY_HOST), true);

const loaderRefusal = thrownBy(() => import.meta.resolve("@tauri-apps/api/core"));
check("the test loader refuses Tauri to a file outside the host", loaderRefusal.includes(ONLY_HOST), true);

console.log(tally.failed ? `tauri boundary: ${tally.failed} check(s) failed` : "tauri boundary: all checks passed");
process.exit(tally.failed ? 1 : 0);
