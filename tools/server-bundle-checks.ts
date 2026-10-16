import { spawnSync } from "node:child_process";
import path from "node:path";
import esbuild from "esbuild";
import { check } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const PROBE = "tools/server-gate-probe";
const CLIENT_APP = `${PROBE}/client-app.ts`;
const CLIENT_IMPORTS_MODULE = `${PROBE}/client-imports-module.ts`;
const TSC = path.join(REPO, "node_modules/.bin/tsc");
const MODULE_SPECIFIER = "@widgetarium/fixture-billing/module";
const FIXTURE = /packages\/fixture-billing\//;
const FIXTURE_CONTRACT = /packages\/fixture-billing\/features\/charge\/contract\.ts$/;
const SERVER_ONLY_CODE =
	/packages\/fixture-billing\/(module\.ts|generated\/module\.ts|features\/[^/]+\/handlers\.ts|gateways\/)|node_modules\/(hono|@orpc\/server)\//;
const SERVER_CONDITION = "server";
const SERVER_MODULE = "packages/fixture-billing/generated/module.ts";
const GUARD_REASON = "a charge is at most";

interface Bundled {
	readonly inputs: readonly string[];
	readonly text: string;
}

const FOR_THE_BROWSER = {
	bundle: true,
	write: false,
	metafile: true,
	format: "esm",
	platform: "browser",
	target: "es2020",
	external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
	jsxFactory: "h",
	jsxFragment: "Fragment",
	logLevel: "silent",
} satisfies esbuild.BuildOptions;

async function bundledOf(entry: string, conditions: readonly string[]): Promise<Bundled> {
	const built = await esbuild.build({ ...FOR_THE_BROWSER, entryPoints: [entry], conditions: [...conditions] });
	const output = Object.values(built.metafile.outputs)[0];
	const inputs = Object.entries(output?.inputs ?? {})
		.filter(([, used]) => used.bytesInOutput > 0)
		.map(([input]) => input);
	return { inputs, text: built.outputFiles[0]?.text ?? "" };
}

async function bundleFailureOf(conditions: readonly string[]): Promise<string> {
	try {
		await esbuild.build({ ...FOR_THE_BROWSER, entryPoints: [CLIENT_IMPORTS_MODULE], conditions: [...conditions] });
		return "";
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

function typeCheckOf(config: string): string {
	const ran = spawnSync(TSC, ["-p", `${PROBE}/${config}`], { cwd: REPO, encoding: "utf8" });
	return ran.status === 0 ? "" : `${ran.stdout}${ran.stderr}`;
}

const { inputs, text } = await bundledOf(CLIENT_APP, ["source"]);
const fromFixture = inputs.filter((input) => FIXTURE.test(input));
check(
	"a client app sending the fixture's requests bundles its contract",
	fromFixture.some((input) => FIXTURE_CONTRACT.test(input)),
	true,
);
check(
	"and none of its module, handlers, gateways, Hono or the oRPC server",
	inputs.filter((input) => SERVER_ONLY_CODE.test(input)),
	[],
);
check("nor any guard: the contract names none, its handler does", text.includes(GUARD_REASON), false);
const served = await bundledOf(SERVER_MODULE, ["source", SERVER_CONDITION]);
check(
	"the server module's bundle does carry the guard, so the check can fail",
	served.text.includes(GUARD_REASON),
	true,
);

const clientTypes = typeCheckOf("tsconfig.client.json");
check("tsc refuses a client import of a server module's ./module", clientTypes.includes(`'${MODULE_SPECIFIER}'`), true);
check("and accepts it under the server condition", typeCheckOf("tsconfig.server.json"), "");
check(
	"a handler with no guard has no .handle, and tsc names the fix",
	typeCheckOf("tsconfig.unguarded.json").includes(
		"Add .guard(AuthenticatedGuard) or .guard(PublicGuard) before .handle(), or guard its server module",
	),
	true,
);

const clientBundle = await bundleFailureOf(["source"]);
check("esbuild refuses a client import of a server module's ./module", clientBundle.includes(MODULE_SPECIFIER), true);
check("and builds it under the server condition", await bundleFailureOf(["source", SERVER_CONDITION]), "");
