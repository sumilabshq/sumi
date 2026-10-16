import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "../packages/host-obsidian/build.mts";
import { PLATFORM_STUB, esbuildPlatformBuildOf } from "../packages/host-obsidian/platform-adapters-plugin.mts";

const OBSIDIAN_ADAPTER = "packages/canvas/adapters/design-source/obsidian/obsidian.adapter.ts";
const OBSIDIAN_ADAPTER_FOLDER = "packages/canvas/adapters/design-source/obsidian/";
const OBSIDIAN_ADAPTER_FILE = /\/obsidian(\/obsidian)?\.adapter\.ts$/;
const SERVER_SECRET = "only-on-the-server";
const SERVER_FIXTURE: Readonly<Record<string, string>> = {
	"packages/demo/requests/ping.command.ts": 'export const PingCommand = { name: "demo/ping", side: "server" };',
	"packages/demo/server/ping/handler-of.ts":
		"export const handlerOf = (request: unknown) => class { static request = request; };",
	"packages/demo/server/ping/ping.handler.ts": [
		'import { PingCommand } from "../../requests/ping.command.js";',
		'import { handlerOf } from "./handler-of.js";',
		`export const SERVER_SECRET = "${SERVER_SECRET}";`,
		"export class PingCommandHandler extends handlerOf(PingCommand) {}",
	].join("\n"),
	"packages/demo/demo.module.ts": 'export { PingCommandHandler, SERVER_SECRET } from "./server/ping/ping.handler.js";',
};
let failed = 0;

async function inputsFor(platform: string): Promise<{ inputs: string[]; imports: string[] }> {
	const built = await esbuild.build({
		entryPoints: ["apps/studio/src/index.ts"],
		bundle: true,
		write: false,
		metafile: true,
		minify: true,
		format: "esm",
		platform: "browser",
		target: "es2020",
		conditions: ["source"],
		define: esbuildPlatformBuildOf(platform).define,
		plugins: [esbuildPlatformBuildOf(platform).plugin],
		external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "obsidian"],
		loader: TEXT_LOADERS,
		jsxFactory: "h",
		jsxFragment: "Fragment",
		logLevel: "silent",
	});
	const output = Object.values(built.metafile.outputs)[0];
	return {
		inputs: Object.keys(output?.inputs ?? {}).filter((input) => (output?.inputs[input]?.bytesInOutput ?? 0) > 0),
		imports: (output?.imports ?? []).map((one) => one.path),
	};
}

function serverFixtureIn(root: string): string {
	for (const [file, source] of Object.entries(SERVER_FIXTURE)) {
		mkdirSync(dirname(join(root, file)), { recursive: true });
		writeFileSync(join(root, file), source);
	}
	return join(root, "packages/demo/demo.module.ts");
}

async function fixtureBuiltFor(entry: string, platform: string): Promise<{ text: string; inputs: string[] }> {
	const built = await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		write: false,
		metafile: true,
		format: "esm",
		platform: "node",
		plugins: [esbuildPlatformBuildOf(platform).plugin],
		logLevel: "silent",
	});
	return { text: built.outputFiles[0]?.text ?? "", inputs: Object.keys(built.metafile.inputs) };
}

function thrownBy(run: () => unknown): string {
	try {
		run();
		return "";
	} catch (thrown) {
		return thrown instanceof Error ? thrown.message : String(thrown);
	}
}

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const web = await inputsFor("web");
const webObsidian = web.inputs.filter((input) => input.startsWith(OBSIDIAN_ADAPTER_FOLDER));
check("the web studio bundle carries no Obsidian design-source code", webObsidian.length === 0, webObsidian);
const webObsidianAdapters = web.inputs.filter((input) => OBSIDIAN_ADAPTER_FILE.test(input));
check(
	"every obsidian.adapter.ts the web bundle reaches is the stand-in that refuses",
	webObsidianAdapters.length > 0 && webObsidianAdapters.every((input) => input.startsWith(`${PLATFORM_STUB}:`)),
	webObsidianAdapters,
);
check(
	"and imports no obsidian module",
	!web.imports.includes("obsidian"),
	web.imports.filter((path) => path === "obsidian"),
);
const obsidian = await inputsFor("obsidian");
check(
	"built for obsidian, the same entry carries the Obsidian adapter, so the checks above can fail",
	obsidian.inputs.includes(OBSIDIAN_ADAPTER),
	obsidian.inputs.filter((input) => input.includes("design-source")),
);
const fixtureRoot = mkdtempSync(join(tmpdir(), "wg-server-stand-in-"));
const fixtureEntry = serverFixtureIn(fixtureRoot);
const webServer = await fixtureBuiltFor(fixtureEntry, "web");
check(
	"a web build carries no code of a domain's server/ folder",
	!webServer.text.includes(SERVER_SECRET),
	webServer.inputs,
);
check(
	"every server/ file the web build reaches is the stand-in",
	webServer.inputs
		.filter((input) => input.includes("/server/"))
		.every((input) => input.startsWith(`${PLATFORM_STUB}:`)),
	webServer.inputs.filter((input) => input.includes("/server/")),
);
const webModulePath = join(fixtureRoot, "web.mjs");
writeFileSync(webModulePath, webServer.text);
const webModule: unknown = await import(pathToFileURL(webModulePath).href);
const standInHandler: unknown = Reflect.get(Object(webModule), "PingCommandHandler");
check(
	"the stand-in handler keeps its request, so a module listing it still routes it to the server",
	Reflect.get(Object(Reflect.get(Object(standInHandler), "request")), "name"),
	"demo/ping",
);
check(
	"constructing the stand-in handler throws the not-built message",
	thrownBy(() => (typeof standInHandler === "function" ? Reflect.construct(standInHandler, []) : null)).includes(
		"belongs to the server build, and this build is for web",
	),
	true,
);
check(
	"reading a stood-in const throws the not-built message",
	thrownBy(() => Reflect.get(Object(Reflect.get(Object(webModule), "SERVER_SECRET")), "length")).includes(
		"belongs to the server build",
	),
	true,
);
const serverServer = await fixtureBuiltFor(fixtureEntry, "server");
check(
	"built for server, the same entry carries the server code, so the checks above can fail",
	serverServer.text.includes(SERVER_SECRET),
	serverServer.inputs,
);
rmSync(fixtureRoot, { recursive: true, force: true });
console.log(failed === 0 ? "web canvas bundle: clean" : `web canvas bundle: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
