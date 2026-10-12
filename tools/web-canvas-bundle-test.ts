import esbuild from "esbuild";
import { TEXT_LOADERS } from "../hosts/obsidian/build.mts";

const OBSIDIAN_ADAPTER = "packages/canvas/ports/design-source-obsidian.ts";
const OBSIDIAN_PORT_FOLDER = "packages/canvas/ports/obsidian/";
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
		define: { __WG_PLATFORM__: JSON.stringify(platform) },
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

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const web = await inputsFor("web");
const webObsidian = web.inputs.filter((input) => input === OBSIDIAN_ADAPTER || input.startsWith(OBSIDIAN_PORT_FOLDER));
check("the web studio bundle carries no Obsidian adapter code", webObsidian.length === 0, webObsidian);
check(
	"and imports no obsidian module",
	!web.imports.includes("obsidian"),
	web.imports.filter((path) => path === "obsidian"),
);
const obsidian = await inputsFor("obsidian");
check(
	"built for obsidian, the same entry carries the Obsidian adapter, so the check above can fail",
	obsidian.inputs.includes(OBSIDIAN_ADAPTER),
	obsidian.inputs.filter((input) => input.includes("design-source")),
);
console.log(failed === 0 ? "web canvas bundle: clean" : `web canvas bundle: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
