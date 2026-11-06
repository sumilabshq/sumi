import fs from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import esbuild from "esbuild";
import type { Metafile, Plugin } from "esbuild";
import { z } from "zod";
import { TEXT_LOADERS } from "./text-loaders.mts";
import { paged, waitUntil } from "./chrome-ask.ts";
import { check, tally } from "./check-helpers.ts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

interface FirstLoad {
	readonly files: readonly string[];
	readonly inputs: readonly string[];
	readonly gzipKb: number;
}

const REPO = path.resolve(import.meta.dirname, "..");
const ENTRY = "tools/startup-budget-page.tsx";
const BUDGET_FILE = path.join(REPO, "tools/startup-budget.json");
const RECORD = process.argv.includes("--record");
const SIZE_GROWTH = 1.1;
const PAINT_MARGIN_MS = 150;
const PAINT_RUNS = 5;
const PAINT_WAIT_MS = 30000;
const PAINT_POLL_MS = 50;
const VIEW = [1440, 900] as const;
const LAZY_MODULES: Readonly<Record<string, RegExp>> = {
	recharts: /node_modules\/recharts\//,
	"the Babel parser": /node_modules\/@babel\/parser\//,
	sucrase: /node_modules\/sucrase\//,
	yaml: /node_modules\/yaml\//,
};
const NEVER_BUNDLED: Readonly<Record<string, RegExp>> = {
	"react-reconciler": /node_modules\/react-reconciler\//,
	"yoga-layout": /node_modules\/yoga-layout\//,
};
const SPLIT_OFF_AT_LEAST: readonly string[] = ["the Babel parser", "yaml"];

const BudgetSchema = z.object({ firstLoadGzipKb: z.number(), paintMs: z.number() });

type Budget = z.infer<typeof BudgetSchema>;

const STYLES_AS_TEXT: Plugin = {
	name: "styles-as-text",
	setup(build) {
		build.onResolve({ filter: /\.css$/ }, () => ({ path: "style", namespace: "no-style" }));
		build.onLoad({ filter: /.*/, namespace: "no-style" }, () => ({ contents: "", loader: "js" }));
	},
};

const TAURI_STUB = `window.__TAURI_INTERNALS__ = {
	invoke: async (command) => {
		if (command === "plugin:store|read") return { doc: null, rev: 0, quarantined: null };
		if (/^plugin:store\\|(open_\\w+_workspace|mark_workspace_opened)$/.test(command))
			return { id: "00000000-0000-4000-8000-000000000000", name: "Budget", folder: null, folderFound: false, lastOpenedAt: 0 };
		throw { code: "io", detail: "the budget page has no Tauri" };
	},
	transformCallback: () => 0,
	metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } },
};`;

const PAINT_PROBE = `(() => {
	const watch = () => {
		const studio = document.querySelector(".wg-studio");
		if (studio !== null && studio.getBoundingClientRect().height > 0 && studio.textContent !== "") {
			window.__STUDIO_PAINTED_MS__ = Math.round(performance.now());
			return;
		}
		requestAnimationFrame(watch);
	};
	requestAnimationFrame(watch);
})();`;

async function builtInto(outdir: string): Promise<Metafile> {
	const built = await esbuild.build({
		entryPoints: [ENTRY],
		outdir,
		bundle: true,
		splitting: true,
		format: "esm",
		platform: "browser",
		target: "es2020",
		minify: true,
		metafile: true,
		conditions: ["source"],
		loader: TEXT_LOADERS,
		plugins: [STYLES_AS_TEXT],
		define: { "process.env.NODE_ENV": '"production"' },
		jsxFactory: "h",
		jsxFragment: "Fragment",
		logLevel: "warning",
	});
	return built.metafile;
}

function firstLoadOf(metafile: Metafile, outdir: string): FirstLoad {
	const entry = Object.keys(metafile.outputs).find((file) => metafile.outputs[file]?.entryPoint === ENTRY);
	if (entry === undefined) {
		throw new Error(`esbuild wrote no output for ${ENTRY}`);
	}

	const files = staticallyLoaded(metafile, entry, new Set<string>());
	const inputs = files.flatMap((file) => writtenInputsOf(metafile, file));
	const bytes = files.reduce((sum, file) => sum + gzipSync(fs.readFileSync(path.resolve(file))).length, 0);
	return {
		files: files.map((file) => path.relative(outdir, path.resolve(file))),
		inputs,
		gzipKb: Math.round(bytes / 1024),
	};
}

function staticallyLoaded(metafile: Metafile, file: string, seen: Set<string>): string[] {
	if (seen.has(file)) {
		return [];
	}

	seen.add(file);
	const imported = (metafile.outputs[file]?.imports ?? []).filter((one) => one.kind === "import-statement");
	return [file, ...imported.flatMap((one) => staticallyLoaded(metafile, one.path, seen))];
}

function writtenInputsOf(metafile: Metafile, file: string): string[] {
	const inputs = Object.entries(metafile.outputs[file]?.inputs ?? {});
	return inputs.filter(([, written]) => written.bytesInOutput > 0).map(([input]) => input);
}

function bundledAnywhere(metafile: Metafile, pattern: RegExp): boolean {
	return Object.keys(metafile.outputs).some((file) =>
		writtenInputsOf(metafile, file).some((input) => pattern.test(input)),
	);
}

function checkSplits(metafile: Metafile, firstLoad: FirstLoad): void {
	for (const [name, pattern] of Object.entries(LAZY_MODULES)) {
		const eager = firstLoad.inputs.filter((input) => pattern.test(input));
		check(`${name} is not loaded before the studio paints`, eager.length, 0);
	}

	for (const name of SPLIT_OFF_AT_LEAST) {
		const pattern = LAZY_MODULES[name];
		check(
			`${name} is still in the build, in a chunk of its own`,
			pattern ? bundledAnywhere(metafile, pattern) : false,
			true,
		);
	}

	for (const [name, pattern] of Object.entries(NEVER_BUNDLED)) {
		check(`${name} is not in the Tauri bundle at all`, bundledAnywhere(metafile, pattern), false);
	}
}

function pageHtml(entryFile: string): string {
	const sheets = BROWSER_SHEET_SOURCES.map((at) => fs.readFileSync(path.join(REPO, at), "utf8")).join("\n");
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${sheets}</style>
<script>${TAURI_STUB}</script>
<script>${PAINT_PROBE}</script>
</head><body><div id="root"></div>
<script type="module" src="./${entryFile}"></script>
</body></html>`;
}

function servedFrom(folder: string): Promise<http.Server> {
	const server = http.createServer((request, response) => {
		const asked = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
		const file = path.join(folder, asked === "/" ? "index.html" : asked);
		if (!file.startsWith(folder) || !fs.existsSync(file)) {
			response.statusCode = 404;
			response.end();
			return;
		}

		response.setHeader("content-type", file.endsWith(".js") ? "text/javascript" : "text/html");
		response.end(fs.readFileSync(file));
	});
	return new Promise((listening) => server.listen(0, "127.0.0.1", () => listening(server)));
}

async function paintedMs(url: string): Promise<number | null> {
	const page = await paged(url, "startup budget", { size: VIEW });
	try {
		let painted: unknown = null;
		await waitUntil(
			async () => {
				painted = await page.ask("window.__STUDIO_PAINTED_MS__ ?? null");
				return typeof painted === "number";
			},
			PAINT_WAIT_MS,
			PAINT_POLL_MS,
		);
		return typeof painted === "number" ? painted : null;
	} finally {
		page.close();
	}
}

async function medianPaintMs(url: string): Promise<number | null> {
	const runs: number[] = [];
	for (let run = 0; run < PAINT_RUNS; run += 1) {
		const painted = await paintedMs(url);
		if (painted === null) {
			return null;
		}

		runs.push(painted);
	}

	console.log(`studio painted at ${runs.join(", ")} ms`);
	return [...runs].sort((one, other) => one - other)[Math.floor(runs.length / 2)] ?? null;
}

function budgetRead(): Budget | null {
	if (!fs.existsSync(BUDGET_FILE)) {
		return null;
	}

	return BudgetSchema.parse(JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8")));
}

const outdir = fs.mkdtempSync(path.join(tmpdir(), "wg-startup-budget-"));
const metafile = await builtInto(outdir);
const firstLoad = firstLoadOf(metafile, outdir);
console.log(`first load: ${firstLoad.gzipKb} KB gzip in ${firstLoad.files.join(", ")}`);
checkSplits(metafile, firstLoad);

const entryFile = firstLoad.files[0] ?? "";
fs.writeFileSync(path.join(outdir, "index.html"), pageHtml(entryFile));
const server = await servedFrom(outdir);
const address = server.address();
const url = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";
const paint = await medianPaintMs(url);
server.close();
fs.rmSync(outdir, { recursive: true, force: true });
check("the studio painted in headless Chrome", paint !== null, true);

if (RECORD && paint !== null) {
	fs.writeFileSync(
		BUDGET_FILE,
		`${JSON.stringify({ firstLoadGzipKb: firstLoad.gzipKb, paintMs: paint }, null, "\t")}\n`,
	);
	console.log(`recorded ${firstLoad.gzipKb} KB and ${paint} ms into ${path.relative(REPO, BUDGET_FILE)}`);
}

const budget = budgetRead();
check("a budget is recorded", budget !== null, true);
if (budget !== null) {
	const sizeCap = Math.round(budget.firstLoadGzipKb * SIZE_GROWTH);
	const paintCap = budget.paintMs + PAINT_MARGIN_MS;
	check(`first-load JS stays within ${sizeCap} KB gzip (got ${firstLoad.gzipKb})`, firstLoad.gzipKb <= sizeCap, true);
	check(
		`the studio paints within ${paintCap} ms (median ${paint ?? "never"})`,
		paint !== null && paint <= paintCap,
		true,
	);
}

console.log(tally.failed === 0 ? "startup budget: within" : `startup budget: ${tally.failed} failed`);
process.exit(tally.failed === 0 ? 0 : 1);
