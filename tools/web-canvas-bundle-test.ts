import esbuild from "esbuild";
import { TEXT_LOADERS } from "./text-loaders.mts";

interface Built {
	readonly inputs: readonly string[];
	readonly imports: readonly string[];
}

const WEB_STUDIO = "apps/studio/src/index.ts";
const FIXTURE_IMPORTING_OBSIDIAN = 'import { Notice } from "obsidian";\nnew Notice("shown");\n';
const SERVER_ENTRY = "packages/shared/data-framework/src/server/index.ts";
const GUARD_IMPORTING_SERVER = "tools/fixture-server-only/owns-invoice-guard.ts";
const FIXTURE_PACKAGES = "tools/fixture-server-only/packages";
const SERVER_CONDITION = "server";
const VAULT_CODE = /packages\/domain\/canvas\/gateways\/[^/]+\/(obsidian\.gateway\.ts|obsidian\/)/;
const CANVAS_MODULE = /packages\/domain\/canvas\/module\.ts$/;
const SERVER_CODE = /node_modules\/(hono|@orpc\/server)\/|packages\/shared\/core\/src\/requests\/server\//;
let failed = 0;

const BUILT_FOR_THE_BROWSER = {
	bundle: true,
	write: false,
	metafile: true,
	minify: true,
	format: "esm",
	platform: "browser",
	target: "es2020",
	conditions: ["source"],
	external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "obsidian"],
	loader: TEXT_LOADERS,
	jsxFactory: "h",
	jsxFragment: "Fragment",
	logLevel: "silent",
} satisfies esbuild.BuildOptions;

async function builtOf(entry: string): Promise<Built> {
	return builtFrom(await esbuild.build({ ...BUILT_FOR_THE_BROWSER, entryPoints: [entry] }));
}

async function builtOfContents(contents: string): Promise<Built> {
	return builtFrom(await esbuild.build({ ...BUILT_FOR_THE_BROWSER, stdin: { contents, resolveDir: "." } }));
}

function builtFrom(built: esbuild.BuildResult<typeof BUILT_FOR_THE_BROWSER>): Built {
	const output = Object.values(built.metafile.outputs)[0];
	return {
		inputs: Object.keys(output?.inputs ?? {}).filter((input) => (output?.inputs[input]?.bytesInOutput ?? 0) > 0),
		imports: (output?.imports ?? []).map((one) => one.path),
	};
}

async function buildFailureOf(conditions: readonly string[]): Promise<string> {
	try {
		await esbuild.build({
			...BUILT_FOR_THE_BROWSER,
			entryPoints: [GUARD_IMPORTING_SERVER],
			conditions: ["source", ...conditions],
			nodePaths: [FIXTURE_PACKAGES],
		});
		return "";
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const web = await builtOf(WEB_STUDIO);
const webVault = web.inputs.filter((input) => VAULT_CODE.test(input));
check(
	"the web studio runs the canvas module, which picks its gateways itself",
	web.inputs.some((input) => CANVAS_MODULE.test(input)),
	web.inputs.filter((input) => CANVAS_MODULE.test(input)),
);
check("its vault gateways ride along as code that names obsidian only as types", webVault.length > 0, webVault.length);
const webServer = web.inputs.filter((input) => SERVER_CODE.test(input));
check("nor the server: no Hono, no oRPC server, no requests/server", webServer.length === 0, webServer);
check(
	"and imports no obsidian module",
	!web.imports.includes("obsidian"),
	web.imports.filter((path) => path === "obsidian"),
);
const builtImportingObsidian = await builtOfContents(FIXTURE_IMPORTING_OBSIDIAN);
check(
	"a file importing obsidian at run time does show the import, so the no-obsidian check can fail",
	builtImportingObsidian.imports.includes("obsidian"),
	builtImportingObsidian.imports.filter((path) => path === "obsidian"),
);
const served = await builtOf(SERVER_ENTRY);
check(
	"the server entry does carry Hono and the oRPC server, so the server check can fail",
	served.inputs.some((input) => SERVER_CODE.test(input)),
	served.inputs.filter((input) => SERVER_CODE.test(input)).length,
);
const guardForClient = await buildFailureOf([]);
check(
	"a guard importing a server-only module fails the client build",
	guardForClient.includes("@fixture/billing/module"),
	guardForClient.slice(0, 120),
);
const guardForServer = await buildFailureOf([SERVER_CONDITION]);
check("and builds under the server condition, so the check can fail", guardForServer === "", guardForServer);
console.log(failed === 0 ? "web canvas bundle: clean" : `web canvas bundle: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
