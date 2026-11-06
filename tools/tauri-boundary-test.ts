import fs from "node:fs";
import path from "node:path";
import { TAURI_REACHERS_TO_MOVE, tauriImportRefusal, tauriOnlyInHost } from "../apps/tauri/tauri-reach.mts";
import { check, tally, thrownBy } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const PLUGINS = path.join(REPO, "plugins");
const TAURI_PACKAGES = "@tauri-apps/";
const TAURI_GLOBAL = "__TAURI";
const ONLY_HOST = "only apps/tauri reaches Tauri";
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"]);
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

function pluginFolders(): readonly string[] {
	return fs
		.readdirSync(PLUGINS, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(PLUGINS, entry.name));
}

function sourceFilesIn(folder: string): readonly string[] {
	return fs
		.readdirSync(folder, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name)))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`));
}

function declaredTauriOf(folder: string): readonly string[] {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));

	if (typeof manifest !== "object" || manifest === null) {
		return [];
	}

	return DEPENDENCY_FIELDS.flatMap((field) => {
		const listed: unknown = Reflect.get(manifest, field);
		return typeof listed === "object" && listed !== null
			? Object.keys(listed).filter((name) => name.startsWith(TAURI_PACKAGES))
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

const plugins = pluginFolders();
check("the plugins folder holds plugins to guard", plugins.length > 0, true);
check(
	"no plugin declares a Tauri package",
	plugins.flatMap((folder) => declaredTauriOf(folder)),
	[],
);
check(
	"no plugin file imports Tauri or reaches its global",
	plugins.flatMap((folder) => tauriReachingFilesIn(folder)),
	[],
);

const pluginFile = path.join(PLUGINS, "main/src/index.ts");
const hostFile = path.join(REPO, "apps/tauri/src/start-tauri-studio.ts");
check(
	"the rule refuses Tauri to a plugin and lets the host through",
	[
		tauriImportRefusal("@tauri-apps/api/core", pluginFile)?.includes(ONLY_HOST) ?? false,
		tauriImportRefusal("@tauri-apps/api/core", hostFile),
		tauriImportRefusal("@sumi/contract", pluginFile),
	],
	[true, null, null],
);
check(
	"the rule refuses Tauri to a shared package not on the list to move",
	tauriImportRefusal("@tauri-apps/api/core", path.join(REPO, "packages/shared/kit/src/index.ts"))?.includes(
		ONLY_HOST,
	) ?? false,
	true,
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

check(
	"every folder still allowed to reach Tauri exists, so a moved one is dropped from the list",
	TAURI_REACHERS_TO_MOVE.filter((folder) => !fs.existsSync(path.join(REPO, folder))),
	[],
);

console.log(tally.failed ? `tauri boundary: ${tally.failed} check(s) failed` : "tauri boundary: all checks passed");
process.exit(tally.failed ? 1 : 0);
