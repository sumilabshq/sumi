import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GENERATED_HEADER } from "../packages/shared/cli/src/module-entry.js";
import { runCli } from "../packages/shared/cli/src/run-cli.js";
import type { CliOutput } from "../packages/shared/cli/src/cli-output.js";
import esbuild from "esbuild";
import { TEXT_LOADERS } from "./text-loaders.mts";
import { packageKindOf } from "../packages/shared/eslint-plugin/src/domain-file.ts";
import { check, tally } from "./check-helpers.ts";
import { ResizeTerminalCommand, TerminalOutputQuery } from "../apps/tauri/capabilities/terminal/generated/contract.ts";

interface CliRun {
	readonly code: number;
	readonly said: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const ENTRY = "generated/index.ts";
const JOINED = "generated/module.ts";
const ROOT = "index.ts";
const CONTRACT = "generated/contract.ts";
const BUILDERS = "generated/command.ts";
const HANDLED = "generated/handled.ts";
const IMPORTED_FROM = /^import .* from "([^"]+)";$/gm;
const RE_EXPORT = /export\s+(\*|\{[^}]*\})\s+from\s/;
const LAYOUT_HANDLING = /packages\/state\/layout\/(features\/.+\/requests\.ts|gateways\/)/;

const CLIENT_FILES: Readonly<Record<string, string>> = {
	"package.json": JSON.stringify({ name: "@fixture/notes", widgetarium: { level: "domain" } }),
	"module.ts": 'export const NotesClientModule = clientModule("notes");\n',
	"features/search/contract.ts": "export const SearchQuery = 1;\n",
	"features/search/handlers.ts":
		'import { NotesClientModule } from "../../module.js";\nexport const SearchQueryHandler = handler(SearchQuery, NotesClientModule).handle(() => 1);\nexport const LIMIT = 1;\n',
	"features/edit/rename/contract.ts": "export const RenameCommand = 1;\n",
	"features/edit/rename/handlers.ts":
		'import { NotesClientModule } from "../../../module.js";\nexport const RenameCommandHandler = handler(RenameCommand, NotesClientModule).handle(() => 1);\n',
	"features/edit/archive/contract.ts": "export const ArchiveCommand = 1;\n",
	"features/edit/archive/handlers.ts": "export const ARCHIVED = 1;\n",
	"shared/schema/note.schema.ts": "export const NoteSchema = 1;\n",
	"shared/schema/folder.schema.ts": "export const FolderSchema = 1;\n",
	"shared/lib/helper.ts": "export const helper = 1;\n",
	"shared/ui/index.ts": "export const Notes = 1;\n",
};

const CLIENT_ENTRY = [
	GENERATED_HEADER.trimEnd(),
	'export * from "../features/edit/archive/contract.js";',
	'export * from "../features/edit/rename/contract.js";',
	'export * from "../features/search/contract.js";',
	'export * from "../shared/schema/folder.schema.js";',
	'export * from "../shared/schema/note.schema.js";',
	'export * from "../shared/ui/index.js";',
	"",
].join("\n");

const SERVER_FILES: Readonly<Record<string, string>> = {
	"package.json": JSON.stringify({ name: "@fixture/billing", widgetarium: { level: "domain" } }),
	"module.ts":
		'export const BillingServerModule = serverModule("billing")\n\t.guard(AuthenticatedGuard)\n\t.use(TimingLoggerMiddleware);\n',
	"features/charge/contract.ts": "export const ChargeCommand = 1;\n",
	"features/charge/handlers.ts":
		'import { BillingServerModule } from "../../module.js";\nexport const ChargeCommandHandler = handler(ChargeCommand, BillingServerModule).guard(G).handle(() => 1);\n',
	"shared/ui/index.ts": "export const Billing = 1;\n",
};

const SERVER_ENTRY = `${GENERATED_HEADER}export * from "../features/charge/contract.js";\n`;

const CLIENT_JOINED = [
	GENERATED_HEADER.trimEnd(),
	'import { RenameCommandHandler } from "../features/edit/rename/handlers.js";',
	'import { SearchQueryHandler } from "../features/search/handlers.js";',
	'import { NotesClientModule as NotesClientModuleDefinition } from "../module.js";',
	"",
	"export const NotesClientModule = NotesClientModuleDefinition.handlers([",
	"\tRenameCommandHandler,",
	"\tSearchQueryHandler,",
	"]);",
	"",
].join("\n");

const PUBLIC_BUMP = 'command("bump")\n\t.public()';
const SERVICE_BUMP = 'command("bump")\n\t.callableBy(LedgerModule)';

const COUNT_REQUESTS = [
	'import { z } from "zod";',
	'import { command, query } from "#module";',
	'import { CountSchema } from "../../shared/schema/count.schema.js";',
	'import { Counter } from "../../gateways/counter/counter.gateway.js";',
	'import { LedgerModule } from "@fixture/ledger";',
	"",
	`export const BumpCommand = ${PUBLIC_BUMP}`,
	"\t.input(z.object({ by: z.number() }))",
	"\t.idempotencyKey((input) => `${input.by}`)",
	"\t.handle(({ by }, { counter }) => counter.add(by));",
	"",
	'export const CountQuery = query("count")',
	"\t.public()",
	"\t.output(CountSchema)",
	"\t.settlesNow()",
	"\t.handle((_input, { counter }) => counter.value);",
	"",
].join("\n");

const SERVICE_COUNT_REQUESTS = COUNT_REQUESTS.replace(PUBLIC_BUMP, SERVICE_BUMP);

function moduleOn(placement: string, chainEnd = ".handles(...handled)"): string {
	return [
		`import { ${placement}, module } from "@widgetarium/data-framework";`,
		'import { counterPartsOn } from "./gateways/counter/counter.gateway.js";',
		'import { handled } from "./generated/handled.js";',
		"",
		`export const TallyModule = module("tally").on(${placement}).provide((facts) => counterPartsOn(facts))${chainEnd};`,
		"",
	].join("\n");
}

function manifestOf(name: string, exported?: Readonly<Record<string, string>>): string {
	return JSON.stringify({
		name: `@fixture/${name}`,
		...(exported === undefined ? {} : { exports: exported }),
		imports: {
			"#module": {
				source: "./generated/command.ts",
				types: "./dist/generated/command.d.ts",
				default: "./dist/generated/command.js",
			},
		},
		widgetarium: { level: "domain" },
	});
}

function servingManifest(name: string): string {
	return manifestOf(name, { ".": "./index.ts", "./server": "./server.ts" });
}

const REQUESTS_FILES: Readonly<Record<string, string>> = {
	"package.json": manifestOf("tally"),
	"module.ts": moduleOn("Device"),
	"features/count/requests.ts": COUNT_REQUESTS,
	"shared/schema/count.schema.ts": "export const CountSchema = 1;\n",
	"shared/lib/index.ts": "export const countOf = 1;\n",
	"gateways/counter/counter.gateway.ts": "export abstract class Counter {}\n",
};

const NO_COUNT_REQUESTS: Readonly<Record<string, string>> = { "features/count/requests.ts": "" };

const REQUESTS_CONTRACT = [
	GENERATED_HEADER.trimEnd(),
	'import { Device, command, moduleContract, query } from "@widgetarium/data-framework";',
	'import { z } from "zod";',
	"",
	"export const CountSchema = 1;",
	"",
	'export const BumpCommand = command("tally/bump")',
	"\t.public()",
	"\t.input(z.object({ by: z.number() }))",
	"\t.idempotencyKey((input) => `${input.by}`);",
	'export const CountQuery = query("tally/count")',
	"\t.public()",
	"\t.output(CountSchema)",
	"\t.settlesNow();",
	"",
	'export const TallyModule = moduleContract("tally", Device, [BumpCommand, CountQuery]);',
	"",
].join("\n");

const REQUESTS_BUILDERS = [
	GENERATED_HEADER.trimEnd(),
	'import { buildersOf } from "@widgetarium/data-framework";',
	'import type { TallyModule } from "../module.js";',
	"",
	"export const { command, query, subscriber } = buildersOf<typeof TallyModule, never>();",
	"",
].join("\n");

const REQUESTS_HANDLED = [
	GENERATED_HEADER.trimEnd(),
	'import type { ModuleItem } from "@widgetarium/data-framework";',
	'import { BumpCommand, CountQuery } from "../features/count/requests.js";',
	"",
	"export const handled: readonly ModuleItem[] = [BumpCommand, CountQuery];",
	"",
].join("\n");

const SERVER_CONTRACT = "generated/server.ts";

const SERVING_SERVER = [
	GENERATED_HEADER.trimEnd(),
	'import { command } from "@widgetarium/data-framework";',
	'import { z } from "zod";',
	"",
	'export const BumpCommand = command("tally/bump")',
	"\t.input(z.object({ by: z.number() }))",
	"\t.idempotencyKey((input) => `${input.by}`);",
	"",
].join("\n");

const SHARING_SERVER = [
	GENERATED_HEADER.trimEnd(),
	'import { CountSchema } from "./contract.js";',
	'import { Repeatable, command } from "@widgetarium/data-framework";',
	'import { z } from "zod";',
	"",
	'export const BumpCommand = command("tally/bump")',
	"\t.input(z.object({ by: CountSchema }))",
	"\t.idempotencyKey(Repeatable);",
	"",
].join("\n");

const CLIENT_PACKAGE_FILES: Readonly<Record<string, string>> = {
	"package.json": JSON.stringify({ name: "@fixture/frame", widgetarium: { level: "client" } }),
	"shared/ui/index.ts": "export const Frame = 1;\n",
	"shared/lib/index.ts": "export const frameOf = 1;\n",
	"features/edges/ui/edge.tsx": "export const Edge = 1;\n",
};

const CLIENT_PACKAGE_ENTRY = `${GENERATED_HEADER}export * from "./shared/ui/index.js";\nexport * from "./shared/lib/index.js";\n`;

const REQUESTS_ENTRY = `${GENERATED_HEADER}export * from "./generated/contract.js";\n`;

const TYPED_REQUESTS = [
	'import { z } from "zod";',
	'import { query } from "#module";',
	'import type { Count } from "../../shared/schema/count.schema.js";',
	"",
	'export const CountQuery = query("count")',
	"\t.public()",
	"\t.output(z.custom<Count>())",
	"\t.settlesNow()",
	"\t.handle((_input, { counter }) => counter.value);",
	"",
].join("\n");

const TYPED_SCHEMA = [
	'import { z } from "zod";',
	"",
	"export const CountSchema = z.number();",
	"",
	"export type Count = z.infer<typeof CountSchema>;",
	"",
	"export const UnusedSchema = z.string();",
	"",
].join("\n");

const TYPED_CONTRACT = [
	GENERATED_HEADER.trimEnd(),
	'import { Device, moduleContract, query } from "@widgetarium/data-framework";',
	'import { z } from "zod";',
	"",
	"export const CountSchema = z.number();",
	"",
	"export type Count = z.infer<typeof CountSchema>;",
	"",
	'export const CountQuery = query("tally/count")',
	"\t.public()",
	"\t.output(z.custom<Count>())",
	"\t.settlesNow();",
	"",
	'export const TallyModule = moduleContract("tally", Device, [CountQuery]);',
	"",
].join("\n");

const FOREST_REQUESTS = [
	'import { query } from "#module";',
	'import { ForestSchema } from "../../shared/schema/forest.schema.js";',
	"",
	'export const ForestQuery = query("forest").public().output(ForestSchema).handle(() => ({ trees: [] }));',
	"",
].join("\n");

const FOREST_SCHEMA = [
	'import { z } from "zod";',
	'import { LabelSchema } from "./label.schema.js";',
	"",
	"export interface Branch {",
	"\treadonly label: string;",
	"\treadonly children: readonly Branch[];",
	"}",
	"",
	"export const BranchSchema: z.ZodType<Branch> = z.lazy(() =>",
	"\tz.object({ label: LabelSchema, children: z.array(BranchSchema).readonly() }),",
	");",
	"",
	"export const ForestSchema = z.object({ name: LabelSchema, trees: z.array(BranchSchema) });",
	"",
	"export type Forest = z.infer<typeof ForestSchema>;",
	"",
].join("\n");

const LABEL_SCHEMA = 'import { z } from "zod";\n\nexport const LabelSchema = z.string().min(1);\n';

const SHARING_REQUESTS = [
	'import { z } from "zod";',
	'import { Repeatable } from "@widgetarium/data-framework";',
	'import { command, query } from "#module";',
	'import { CountSchema } from "../../shared/schema/count.schema.js";',
	"",
	'export const BumpCommand = command("bump")',
	"\t.input(z.object({ by: CountSchema }))",
	"\t.idempotencyKey(Repeatable)",
	"\t.handle(() => undefined);",
	"",
	'export const CountQuery = query("count")',
	"\t.public()",
	"\t.output(CountSchema)",
	"\t.settlesNow()",
	"\t.handle(() => 0);",
	"",
].join("\n");

const EVENTS = [
	'import { event } from "@widgetarium/data-framework";',
	'export const CountedEvent = event("counted").public();',
	'export const RecountedEvent = event("recounted");',
	"",
].join("\n");

async function generatedIn(name: string, files: Readonly<Record<string, string>>): Promise<CliRun> {
	layFiles(path.join(scratch, "packages", name), {
		...REQUESTS_FILES,
		"package.json": manifestOf(name),
		...files,
	});
	return cli([`packages/${name}`], scratch);
}

function importedFrom(text: string): string[] {
	return [...text.matchAll(IMPORTED_FROM)].map(([, specifier]) => specifier ?? "").sort();
}

function packageFoldersOf(root: string): string[] {
	const packages = path.join(root, "packages");
	const plugins = path.join(root, "plugins");
	const layered = fs
		.readdirSync(packages)
		.flatMap((layer) => fs.readdirSync(path.join(packages, layer)).map((name) => path.join(packages, layer, name)));
	const owned = fs
		.readdirSync(plugins)
		.map((name) => path.join(plugins, name, "data"))
		.filter((data) => fs.existsSync(data))
		.flatMap((data) => fs.readdirSync(data).map((name) => path.join(data, name)));
	return [...layered, ...owned];
}

function newShapePackagesOf(root: string): string[] {
	return packageFoldersOf(root).filter((folder) => {
		const kind = packageKindOf(folder);
		return kind?.kind === "client-package" || (kind?.kind === "module" && kind.module.runs === "anywhere");
	});
}

function generatedFilesOf(root: string): string[] {
	return packageFoldersOf(root)
		.map((folder) => path.join(folder, "generated"))
		.filter((generated) => fs.existsSync(generated))
		.flatMap((generated) => fs.readdirSync(generated).map((name) => path.join(generated, name)))
		.filter((file) => file.endsWith(".ts"));
}

function reExportsUnder(folder: string): string[] {
	const generated = path.join(folder, "generated");

	if (!fs.existsSync(generated)) {
		return [];
	}

	return fs
		.readdirSync(generated)
		.filter((name) => RE_EXPORT.test(fs.readFileSync(path.join(generated, name), "utf8")))
		.map((name) => path.join(path.basename(folder), "generated", name));
}

async function bundledInputsOf(entry: string): Promise<string[]> {
	const built = await esbuild.build({
		entryPoints: [path.join(REPO, entry)],
		bundle: true,
		conditions: ["source"],
		loader: TEXT_LOADERS,
		write: false,
		metafile: true,
		format: "esm",
		platform: "browser",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		logLevel: "silent",
	});
	return Object.keys(built.metafile.inputs);
}

function layoutHandlingOf(inputs: readonly string[]): string[] {
	return inputs.filter((input) => LAYOUT_HANDLING.test(input));
}

function refusedWith(run: CliRun, words: string): readonly [number, boolean] {
	return [run.code, run.said.includes(words)];
}

function layFiles(root: string, files: Readonly<Record<string, string>>): void {
	for (const [relative, text] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
		fs.writeFileSync(path.join(root, relative), text);
	}
}

async function cli(argv: readonly string[], cwd: string): Promise<CliRun> {
	const lines: string[] = [];
	const output: CliOutput = { out: (text) => lines.push(text), err: (text) => lines.push(text) };
	const code = await runCli(["generate", ...argv], output, cwd);
	return { code, said: lines.join("\n") };
}

function entryIn(module: string, entry = ENTRY): string {
	const at = path.join(module, entry);
	return fs.existsSync(at) ? fs.readFileSync(at, "utf8") : "";
}

function filesIn(folder: string): string[] {
	return fs.existsSync(folder) ? fs.readdirSync(folder).sort() : [];
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wg-generated-"));
try {
	const notes = path.join(scratch, "packages/notes");
	const billing = path.join(scratch, "packages/billing");
	layFiles(scratch, { "package.json": JSON.stringify({ name: "fixture", workspaces: ["packages/*"] }) });
	layFiles(notes, CLIENT_FILES);
	layFiles(billing, SERVER_FILES);

	const written = await cli([], scratch);
	check("generate with no folder answers 0 over every domain of the workspaces", written.code, 0);
	check("a client module's entry: nested contracts, schemas and ui/index, sorted", entryIn(notes), CLIENT_ENTRY);
	check("a server module's entry carries no ui", entryIn(billing), SERVER_ENTRY);
	check(
		"the assembled module joins the definition with every exported *Handler naming it, sorted",
		entryIn(notes, JOINED),
		CLIENT_JOINED,
	);
	check(
		"a server module is assembled the same way",
		entryIn(billing, JOINED).includes("BillingServerModuleDefinition.handlers([\n\tChargeCommandHandler,\n]);"),
		true,
	);

	const again = await cli(["packages/notes"], scratch);
	check("a second run writes the same bytes", [again.code, entryIn(notes)], [0, CLIENT_ENTRY]);

	const fresh = await cli(["--check"], scratch);
	check("--check answers 0 while every entry is fresh", fresh.code, 0);

	fs.writeFileSync(path.join(notes, ENTRY), `${CLIENT_ENTRY}export const handWritten = 1;\n`);
	const stale = await cli(["--check"], scratch);
	check(
		"--check answers 1 and names the module whose entry was edited",
		[stale.code, stale.said.includes("packages/notes")],
		[1, true],
	);
	check("--check leaves the stale file as it found it", entryIn(notes).includes("handWritten"), true);
	check("--check does not name a fresh module", stale.said.includes("packages/billing"), false);

	fs.rmSync(path.join(billing, "generated"), { recursive: true });
	const missing = await cli(["--check", "packages/billing"], scratch);
	check(
		"--check answers 1 for a module with no entry",
		[missing.code, missing.said.includes("packages/billing")],
		[1, true],
	);

	layFiles(path.join(scratch, "packages/odd"), {
		"package.json": JSON.stringify({ name: "@fixture/odd", widgetarium: { level: "domain" } }),
		"module.ts": "export const oddModule = 1;\n",
	});
	layFiles(path.join(scratch, "packages/stray"), {
		"package.json": JSON.stringify({ name: "@fixture/stray", widgetarium: { level: "domain" } }),
		"module.ts": 'export const StrayClientModule = clientModule("stray");\n',
		"features/walk/handlers.ts":
			'import { NotesClientModule } from "../../../notes/module.js";\nexport const WalkQueryHandler = handler(WalkQuery, NotesClientModule).handle(() => 1);\n',
	});
	const stray = await cli(["packages/stray"], scratch);
	check(
		"generate refuses a handler that names another folder's module, naming file and handler",
		[stray.code, stray.said.includes("features/walk/handlers.ts: WalkQueryHandler names NotesClientModule")],
		[1, true],
	);
	const tally = path.join(scratch, "packages/tally");
	layFiles(tally, REQUESTS_FILES);
	const requests = await cli(["packages/tally"], scratch);
	check("a module(...) is generated with no handler file", requests.code, 0);
	check(
		"its contract keeps each public chain up to the first handling step, .public() kept, in file order",
		entryIn(tally, CONTRACT),
		REQUESTS_CONTRACT,
	);
	check(
		"its generated/command.ts types the request builders by the module's own definition",
		entryIn(tally, BUILDERS),
		REQUESTS_BUILDERS,
	);
	check("its generated/handled.ts lists every handled request, sorted", entryIn(tally, HANDLED), REQUESTS_HANDLED);
	check("its public entry is the root index.ts, re-exporting the contract alone", entryIn(tally, ROOT), REQUESTS_ENTRY);
	check(
		"its generated/ holds the contract, the builders and the handled list: no index.ts, no module.ts, no gateways.ts",
		filesIn(path.join(tally, "generated")),
		["command.ts", "contract.ts", "handled.ts"],
	);
	check(
		"the contract is self-contained: it imports only zod and @widgetarium/data-framework, never #module",
		importedFrom(entryIn(tally, CONTRACT)),
		["@widgetarium/data-framework", "zod"],
	);
	check(
		"a short request name reaches the contract as <module>/<short>",
		["tally/count", "tally/bump"].every((name) => entryIn(tally, CONTRACT).includes(`("${name}")`)),
		true,
	);
	check(
		"the contract carries no handler code and no .callableBy(): no gateway import, no handle, no named module",
		["counter.gateway", ".handle(", ".callableBy(", "LedgerModule"].filter((word) =>
			entryIn(tally, CONTRACT).includes(word),
		),
		[],
	);

	const frame = path.join(scratch, "packages/frame");
	layFiles(frame, CLIENT_PACKAGE_FILES);
	const framed = await cli(["packages/frame"], scratch);
	check(
		"a client package, with no module.ts, gets a generated entry of its public ui and lib",
		[framed.code, entryIn(frame, ROOT), fs.existsSync(path.join(frame, "generated"))],
		[0, CLIENT_PACKAGE_ENTRY, false],
	);

	const leaked = await generatedIn("leaky", {
		"features/count/requests.ts": COUNT_REQUESTS.replace(".output(CountSchema)", ".output(Counter)"),
	});
	check(
		"a contract reaching a gateway is refused, naming file, request and import",
		[leaked.code, leaked.said.includes("features/count/requests.ts: the contract of CountQuery uses Counter")],
		[1, true],
	);

	const besideRun = await generatedIn("beside", {
		"features/count/requests.ts": `const LocalSchema = 1;\n${COUNT_REQUESTS.replace(".output(CountSchema)", ".output(LocalSchema)")}`,
	});
	check(
		"a contract using a schema declared beside it is refused: it belongs in shared/schema",
		[besideRun.code, besideRun.said.includes("uses LocalSchema, declared in that file")],
		[1, true],
	);

	const typed = await generatedIn("typed", {
		"features/count/requests.ts": TYPED_REQUESTS,
		"shared/schema/count.schema.ts": TYPED_SCHEMA,
	});
	check(
		"a type used by a contract is copied with its schema, and an unused schema stays behind",
		[typed.code, entryIn(path.join(scratch, "packages/typed"), CONTRACT)],
		[0, TYPED_CONTRACT],
	);

	const evented = await generatedIn("evented", { "shared/events/count.events.ts": EVENTS });
	const eventedFolder = path.join(scratch, "packages/evented");
	const eventedContract = entryIn(eventedFolder, CONTRACT);
	check(
		"the contract holds the .public() events, never a private one, and the module descriptor lists requests only",
		[
			evented.code,
			eventedContract.includes('export const CountedEvent = event("tally/counted").public();'),
			eventedContract.includes("Recounted"),
			eventedContract.includes('moduleContract("tally", Device, [BumpCommand, CountQuery])'),
		],
		[0, true, false, true],
	);
	check(
		"generated/handled.ts lists every event, public or not, beside the handled requests",
		entryIn(eventedFolder, HANDLED).includes("[BumpCommand, CountQuery, CountedEvent, RecountedEvent]"),
		true,
	);
	check(
		"generated/command.ts types emit by every event of the module, imported as types",
		[
			entryIn(eventedFolder, BUILDERS).includes(
				'import type { CountedEvent, RecountedEvent } from "../shared/events/count.events.js";',
			),
			entryIn(eventedFolder, BUILDERS).includes(
				"buildersOf<typeof TallyModule, typeof CountedEvent | typeof RecountedEvent>();",
			),
		],
		[true, true],
	);

	const forest = await generatedIn("forest", {
		...NO_COUNT_REQUESTS,
		"features/forest/requests.ts": FOREST_REQUESTS,
		"shared/schema/forest.schema.ts": FOREST_SCHEMA,
		"shared/schema/label.schema.ts": LABEL_SCHEMA,
	});
	const forestContract = entryIn(path.join(scratch, "packages/forest"), CONTRACT);
	check(
		"schemas are copied across schema files and through z.lazy, each before its first eager use, with their interfaces and inferred types",
		[
			forest.code,
			importedFrom(forestContract),
			["interface Branch", "type Forest ="].every((word) => forestContract.includes(word)),
			forestContract.indexOf("LabelSchema =") < forestContract.indexOf("ForestSchema ="),
			forestContract.indexOf("BranchSchema:") < forestContract.indexOf("ForestSchema ="),
		],
		[0, ["@widgetarium/data-framework", "zod"], true, true, true],
	);
	check("every copied declaration appears once", forestContract.split("export const LabelSchema").length, 2);

	const refined = await generatedIn("refined", {
		"shared/schema/count.schema.ts":
			'import { z } from "zod";\nexport const CountSchema = z.number().refine((n) => n > 0);\n',
	});
	check(
		"a copied schema built with a function is refused by name",
		refusedWith(
			refined,
			"shared/schema/count.schema.ts: CountSchema is built with a function; move it out of the shape: refinements and helpers belong to the handler or the gateway",
		),
		[1, true],
	);

	const helped = await generatedIn("helped", {
		"shared/schema/count.schema.ts": 'import { z } from "zod";\nexport const CountSchema = z.number().max(mostOf());\n',
	});
	check(
		"a copied schema calling a helper is refused by name",
		refusedWith(helped, "CountSchema is built with a call of a helper; move it out of the shape"),
		[1, true],
	);

	const foreign = await generatedIn("foreign", {
		"shared/schema/count.schema.ts":
			'import { z } from "zod";\nimport { MOST } from "../lib/limits.js";\nexport const CountSchema = z.number().max(MOST);\n',
		"shared/lib/limits.ts": "export const MOST = 9;\n",
	});
	check(
		"a copied schema reading a foreign import is refused by name",
		refusedWith(
			foreign,
			"shared/schema/count.schema.ts: MOST comes from ../lib/limits.js; a schema copied into the contract reads only zod and shared/schema",
		),
		[1, true],
	);

	const packaged = await generatedIn("packaged", {
		"features/count/requests.ts": `import { Shape } from "some-package";\n${COUNT_REQUESTS.replace(".output(CountSchema)", ".output(Shape)")}`,
	});
	check(
		"a contract using a package other than zod and core is refused",
		refusedWith(
			packaged,
			"uses Shape from some-package; a contract imports only zod, @widgetarium/data-framework and shared/schema",
		),
		[1, true],
	);

	const keyed = await generatedIn("keyed", {
		"features/count/requests.ts": COUNT_REQUESTS.replace("(input) => `${input.by}`", "(input) => String(input.by)"),
	});
	check(
		"a key function doing more than reading its input is refused",
		refusedWith(
			keyed,
			"features/count/requests.ts: the idempotency key of BumpCommand is a function a client cannot carry",
		),
		[1, true],
	);

	const strays = path.join(scratch, "packages/strays");
	layFiles(strays, {
		...REQUESTS_FILES,
		"package.json": manifestOf("strays"),
		"generated/index.ts": 'export * from "./contract.js";\n',
	});
	const strayCheck = await cli(["--check", "packages/strays"], scratch);
	const strayRun = await cli(["packages/strays"], scratch);
	check(
		"--check names a file under generated/ that generate no longer writes, and generate removes it",
		[
			strayCheck.code,
			strayCheck.said.includes("generated/index.ts is a file generate no longer writes"),
			strayRun.code,
			fs.existsSync(path.join(strays, "generated/index.ts")),
		],
		[1, true, 0, false],
	);

	const twice = await generatedIn("twice", {
		"features/recount/requests.ts":
			'import { query } from "#module";\nexport const CountQuery = query("recount").public().handle(() => 0);\n',
	});
	check(
		"a const name declared in two request files is refused, naming both files",
		refusedWith(
			twice,
			"TallyModule: CountQuery is declared in features/count/requests.ts and features/recount/requests.ts",
		),
		[1, true],
	);

	const inProcess = await generatedIn("in-process", {
		"features/count/requests.ts": COUNT_REQUESTS.replace(PUBLIC_BUMP, 'command("bump")'),
	});
	const inProcessFolder = path.join(scratch, "packages/in-process");
	check(
		"a Device module's unmarked request stays in-process: out of the contract, no server.ts, still handled",
		[
			inProcess.code,
			entryIn(inProcessFolder, CONTRACT).includes("BumpCommand"),
			fs.existsSync(path.join(inProcessFolder, SERVER_CONTRACT)),
			entryIn(inProcessFolder, HANDLED).includes("[BumpCommand, CountQuery]"),
		],
		[0, false, false, true],
	);

	const serving = await generatedIn("serving", {
		"package.json": servingManifest("serving"),
		"module.ts": moduleOn("Server"),
		"features/count/requests.ts": SERVICE_COUNT_REQUESTS,
	});
	const servingFolder = path.join(scratch, "packages/serving");
	check(
		"a request callable only by named services leaves the public contract, which names the module on the server",
		[
			serving.code,
			entryIn(servingFolder, CONTRACT).includes("BumpCommand"),
			entryIn(servingFolder, CONTRACT).includes('moduleContract("tally", Server, [CountQuery])'),
		],
		[0, false, true],
	);
	check(
		"a Server module's non-public requests are cut into generated/server.ts, .callableBy() cut out",
		entryIn(servingFolder, SERVER_CONTRACT),
		SERVING_SERVER,
	);
	check(
		"the root server.ts is the server-only entry and re-exports it alone",
		entryIn(servingFolder, "server.ts"),
		`${GENERATED_HEADER}export * from "./generated/server.js";\n`,
	);

	layFiles(servingFolder, { "features/count/requests.ts": COUNT_REQUESTS });
	check(
		'a package still exporting "./server" once nothing is server-only is refused by name, and nothing is removed',
		[
			...refusedWith(
				await cli(["packages/serving"], scratch),
				'@fixture/serving exports "./server" in package.json, and its module lists nothing server-only',
			),
			fs.existsSync(path.join(servingFolder, SERVER_CONTRACT)),
		],
		[1, true, true],
	);

	layFiles(servingFolder, { "package.json": manifestOf("serving") });
	await cli(["packages/serving"], scratch);
	check(
		"a module with nothing server-only loses both server files on the next run",
		[fs.existsSync(path.join(servingFolder, SERVER_CONTRACT)), fs.existsSync(path.join(servingFolder, "server.ts"))],
		[false, false],
	);

	const unexported = await generatedIn("unexported", {
		"module.ts": moduleOn("Server"),
		"features/count/requests.ts": SERVICE_COUNT_REQUESTS,
	});
	check(
		'server-only requests in a package whose package.json exports no "./server" are refused by name',
		refusedWith(
			unexported,
			'@fixture/unexported lists server-only requests, and its package.json exports no "./server"',
		),
		[1, true],
	);

	const handWritten = await generatedIn("hand-written", {
		"module.ts": moduleOn("Server"),
		"server.ts": 'export * from "./generated/server.js";\n',
	});
	check(
		"a hand-written root server.ts beside a module with nothing server-only is refused by name",
		refusedWith(handWritten, "@fixture/hand-written: server.ts is not generated"),
		[1, true],
	);

	const sharing = await generatedIn("sharing", {
		"package.json": servingManifest("sharing"),
		"module.ts": moduleOn("Server"),
		"features/count/requests.ts": SHARING_REQUESTS,
		"shared/schema/count.schema.ts": TYPED_SCHEMA,
	});
	const sharingFolder = path.join(scratch, "packages/sharing");
	check(
		"a schema both a public and a server-only request use is copied once, into the public contract",
		[
			sharing.code,
			entryIn(sharingFolder, CONTRACT).includes("export const CountSchema = z.number();"),
			entryIn(sharingFolder, SERVER_CONTRACT),
		],
		[0, true, SHARING_SERVER],
	);

	const split = await generatedIn("split", {
		"features/count/requests.ts":
			'import { query } from "#module";\nimport { CountSchema as Shape } from "../../shared/schema/count.schema.js";\nexport const CountQuery = query("count").public().output(Shape).handle(() => 0);\n',
		"features/bump/requests.ts":
			'import { Repeatable } from "@widgetarium/data-framework";\nimport { command } from "#module";\nimport { BumpSchema as Shape } from "../../shared/schema/bump.schema.js";\nexport const BumpCommand = command("bump").public().input(Shape).idempotencyKey(Repeatable).handle(() => undefined);\n',
		"shared/schema/bump.schema.ts": "export const BumpSchema = 1;\n",
	});
	check(
		"a schema imported under another name is refused: the contract copies it by its own name",
		refusedWith(split, "import a schema by its own name from shared/schema"),
		[1, true],
	);

	const unhandled = await generatedIn("unhandled", { "module.ts": moduleOn("Device", "") });
	check(
		"a module.ts whose chain does not end with .handles(...handled) is refused by name",
		refusedWith(unhandled, "TallyModule: module.ts must end with .handles(...handled)"),
		[1, true],
	);

	const elsewhereHandled = await generatedIn("elsewhere-handled", {
		"module.ts": moduleOn("Device").replace("./generated/handled.js", "./handled.js"),
	});
	check(
		'a .handles(...handled) whose handled is not imported from "./generated/handled.js" is refused',
		refusedWith(elsewhereHandled, 'importing handled from "./generated/handled.js"'),
		[1, true],
	);

	const unbuilt = await generatedIn("unbuilt", {
		"package.json": JSON.stringify({ name: "@fixture/unbuilt", widgetarium: { level: "domain" } }),
	});
	check(
		'a package.json whose "imports" names no "#module" is refused by name',
		refusedWith(unbuilt, '@fixture/unbuilt: its requests take command and query from "#module"'),
		[1, true],
	);

	const extraHandled = await generatedIn("extra-handled", {
		"module.ts": moduleOn("Device", ".handles(...handled, CountQuery)"),
	});
	check(
		"a .handles() given anything besides the single ...handled is refused",
		refusedWith(extraHandled, "TallyModule: module.ts must end with .handles(...handled)"),
		[1, true],
	);

	const unhandledRequest = await generatedIn("unhandled-request", {
		"features/count/requests.ts": COUNT_REQUESTS.replace(
			"\t.settlesNow()\n\t.handle((_input, { counter }) => counter.value);",
			"\t.settlesNow();",
		),
	});
	check(
		"a request with no .handle() in a module package is refused, naming file and const",
		refusedWith(unhandledRequest, "features/count/requests.ts: CountQuery is a query with no .handle(...)"),
		[1, true],
	);

	const strayRequest = await generatedIn("stray-request", {
		"shared/lib/extra.ts":
			'import { query } from "#module";\nexport const ExtraQuery = query("extra").public().handle(() => 0);\n',
	});
	check(
		"an exported request outside the files generate reads is refused, naming file and const",
		refusedWith(strayRequest, "shared/lib/extra.ts: ExtraQuery is a query outside features/<feature>/requests.ts"),
		[1, true],
	);

	const broken = await generatedIn("broken", { "features/count/requests.ts": `${COUNT_REQUESTS}export const = ;\n` });
	check(
		"a request file Babel cannot parse is refused by name",
		refusedWith(broken, "features/count/requests.ts cannot be read"),
		[1, true],
	);

	const unknown = await generatedIn("unknown", {
		"features/count/requests.ts": COUNT_REQUESTS.replace(".output(CountSchema)", ".output(Mystery)"),
	});
	check(
		"a contract naming what its file neither imports nor declares is refused",
		refusedWith(unknown, "the contract of CountQuery uses Mystery, which that file neither imports nor declares"),
		[1, true],
	);

	const scoped = await generatedIn("scoped", {
		"features/count/requests.ts": COUNT_REQUESTS.replace("(input) => `${input.by}`", "({ by = fallback }) => `${by}`"),
	});
	check(
		"a key function destructuring its input is refused before its default is read",
		refusedWith(scoped, "the idempotency key of BumpCommand is a function a client cannot carry"),
		[1, true],
	);

	const unread = await cli(["packages/odd"], scratch);
	check(
		"a module.ts exporting no serverModule(...) or clientModule(...) const is refused by name",
		[unread.code, unread.said.includes("packages/odd/module.ts")],
		[1, true],
	);
} finally {
	fs.rmSync(scratch, { recursive: true, force: true });
}

check(
	"a request of a generated contract keeps its .public(), so it reports a public reach",
	[TerminalOutputQuery.visibility.reach, ResizeTerminalCommand.visibility.reach],
	["public", "public"],
);

const repo = await cli(["--check"], REPO);
const generatedFiles = generatedFilesOf(REPO);
check(
	"this repository has generated files to hold to the header, the canvas contract among them",
	generatedFiles.some((file) => file.endsWith("packages/domain/canvas/generated/contract.ts")),
	true,
);
check(
	"every generated file of this repository opens with the generated header",
	generatedFiles.filter((file) => !fs.readFileSync(file, "utf8").startsWith(GENERATED_HEADER)),
	[],
);
check("every domain of this repository has a fresh generated entry", repo.code === 0 ? 0 : repo.said, 0);
const newShapes = newShapePackagesOf(REPO);
check(
	"this repository has module(...) packages to hold to the generated/ law",
	newShapes
		.map((folder) => path.basename(folder))
		.filter((name) => ["layout", "mascot"].includes(name))
		.sort(),
	["layout", "mascot"],
);
check(
	"no generated/ of a module(...) or client package re-exports: export * from and export { } from live only in the root index.ts",
	newShapes.flatMap(reExportsUnder),
	[],
);

const frameInputs = await bundledInputsOf("apps/studio/src/features/frame/ui/studio-frame/studio-frame.tsx");
const startedInputs = await bundledInputsOf("packages/state/layout/module.ts");
check(
	"the studio frame's bundle reads layout through its contract: it holds the generated contract",
	frameInputs.some((input) => input.endsWith("packages/state/layout/generated/contract.ts")),
	true,
);
check(
	"and pulls no layout handler or gateway, which only the app starting LayoutModule bundles",
	layoutHandlingOf(frameInputs),
	[],
);
check(
	"the module's own bundle does carry its handlers and gateways, so the check can fail",
	layoutHandlingOf(startedInputs).length > 0,
	true,
);

console.log(tally.failed ? `generated: ${tally.failed} check(s) failed` : "generated: all checks passed");
process.exit(tally.failed ? 1 : 0);
