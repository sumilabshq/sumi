import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GENERATED_HEADER } from "../packages/cli/src/module-entry.js";
import { runCli } from "../packages/cli/src/run-cli.js";
import type { CliOutput } from "../packages/cli/src/cli-output.js";
import { check, tally } from "./check-helpers.ts";

interface CliRun {
	readonly code: number;
	readonly said: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const ENTRY = "generated/index.ts";
const JOINED = "generated/module.ts";

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

const COUNT_REQUESTS = [
	'import { z } from "zod";',
	'import { Repeatable, command, query } from "@widgetarium/core/requests";',
	'import { CountSchema } from "../../shared/schema/count.schema.js";',
	'import { Counter } from "../../gateways/counter/counter.gateway.js";',
	"",
	'export const BumpCommand = command("tally/bump")',
	"\t.input(z.object({ by: z.number() }))",
	"\t.idempotencyKey((input) => String(input.by))",
	"\t.invalidates([CountQuery])",
	"\t.inject({ counter: Counter })",
	"\t.handle(({ by }, { counter }) => counter.add(by));",
	"",
	'export const CountQuery = query("tally/count")',
	"\t.output(CountSchema)",
	"\t.settlesNow()",
	"\t.inject({ counter: Counter })",
	"\t.handle((_input, { counter }) => counter.value);",
	"",
].join("\n");

const REQUESTS_FILES: Readonly<Record<string, string>> = {
	"package.json": JSON.stringify({ name: "@fixture/tally", widgetarium: { level: "domain" } }),
	"module.ts": [
		'import { module } from "@widgetarium/core/requests";',
		'import { BumpCommand, CountQuery } from "./features/count/requests.js";',
		"",
		'export const TallyModule = module("tally").queries(CountQuery).commands(BumpCommand).provide((parts: TallyParts) => ({ ...parts }));',
		"",
	].join("\n"),
	"features/count/requests.ts": COUNT_REQUESTS,
	"shared/schema/count.schema.ts": "export const CountSchema = 1;\n",
	"shared/lib/index.ts": "export const countOf = 1;\n",
	"gateways/counter/counter.gateway.ts": "export abstract class Counter {}\n",
};

const REQUESTS_CONTRACT = [
	GENERATED_HEADER.trimEnd(),
	'import { CountSchema } from "../shared/schema/count.schema.js";',
	'import { command, query } from "@widgetarium/core/requests";',
	'import { z } from "zod";',
	"",
	'export const CountQuery = query("tally/count")',
	"\t.output(CountSchema)",
	"\t.settlesNow();",
	'export const BumpCommand = command("tally/bump")',
	"\t.input(z.object({ by: z.number() }))",
	"\t.idempotencyKey((input) => String(input.by))",
	"\t.invalidates([CountQuery]);",
	"",
].join("\n");

const CLIENT_PACKAGE_FILES: Readonly<Record<string, string>> = {
	"package.json": JSON.stringify({ name: "@fixture/frame", widgetarium: { level: "client" } }),
	"shared/ui/index.ts": "export const Frame = 1;\n",
	"shared/lib/index.ts": "export const frameOf = 1;\n",
	"features/edges/ui/edge.tsx": "export const Edge = 1;\n",
};

const CLIENT_PACKAGE_ENTRY = `${GENERATED_HEADER}export * from "../shared/ui/index.js";\nexport * from "../shared/lib/index.js";\n`;

const REQUESTS_ENTRY = `${GENERATED_HEADER}export * from "./contract.js";\nexport * from "../shared/schema/count.schema.js";\nexport * from "../shared/lib/index.js";\n`;

const FORMS_REQUESTS = [
	'import * as schemas from "../../shared/schema/count.schema.js";',
	'import z from "zod";',
	'import { command, query } from "@widgetarium/core/requests";',
	'import type { Count } from "../../shared/schema/count.schema.js";',
	'import { Counter } from "../../gateways/counter/counter.gateway.js";',
	"",
	'export const CountQuery = query("tally/count")',
	"\t.output(schemas.CountSchema)",
	"\t.settlesNow()",
	"\t.inject({ counter: Counter })",
	"\t.handle((_input, { counter }) => counter.value);",
	"",
	'export const SetCommand = command("tally/set")',
	"\t.input(z.object({ to: z.number() }))",
	"\t.idempotencyKey((input: { readonly to: Count }, step = 1) => {",
	"\t\tconst doubled = input?.to * step;",
	"\t\treturn String({ key() { return doubled; } }.key());",
	"\t})",
	"\t.invalidates([CountQuery])",
	"\t.inject({ counter: Counter })",
	"\t.handle(() => undefined);",
	"",
].join("\n");

const FORMS_CONTRACT = [
	GENERATED_HEADER.trimEnd(),
	'import * as schemas from "../shared/schema/count.schema.js";',
	'import type { Count } from "../shared/schema/count.schema.js";',
	'import { command, query } from "@widgetarium/core/requests";',
	'import z from "zod";',
	"",
	'export const CountQuery = query("tally/count")',
	"\t.output(schemas.CountSchema)",
	"\t.settlesNow();",
	'export const SetCommand = command("tally/set")',
	"\t.input(z.object({ to: z.number() }))",
	"\t.idempotencyKey((input: { readonly to: Count }, step = 1) => {",
	"\t\tconst doubled = input?.to * step;",
	"\t\treturn String({ key() { return doubled; } }.key());",
	"\t})",
	"\t.invalidates([CountQuery]);",
	"",
].join("\n");

function moduleListing(listing: string, from = "./features/count/requests.js"): string {
	const names = [...new Set(listing.match(/[A-Z]\w+(Query|Command)/g) ?? [])].join(", ");
	return [
		'import { module } from "@widgetarium/core/requests";',
		`import { ${names} } from "${from}";`,
		"",
		`export const TallyModule = module("tally")${listing}.provide((parts: TallyParts) => ({ ...parts }));`,
		"",
	].join("\n");
}

async function generatedIn(name: string, files: Readonly<Record<string, string>>): Promise<CliRun> {
	layFiles(path.join(scratch, "packages", name), {
		...REQUESTS_FILES,
		"package.json": JSON.stringify({ name: `@fixture/${name}`, widgetarium: { level: "domain" } }),
		...files,
	});
	return cli([`packages/${name}`], scratch);
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
		"its contract keeps each listed chain up to the first handling step, ordered so a named query comes first",
		entryIn(tally, "generated/contract.ts"),
		REQUESTS_CONTRACT,
	);
	check(
		"its entry exports the contract, the schemas and the pure helpers of shared/lib/index.ts",
		entryIn(tally),
		REQUESTS_ENTRY,
	);
	check(
		"its ./module entry is the module.ts const itself",
		entryIn(tally, JOINED),
		`${GENERATED_HEADER}export { TallyModule } from "../module.js";\n`,
	);
	check(
		"the contract carries no handler code: no gateway import, no inject, no handle",
		["counter.gateway", ".inject(", ".handle("].filter((word) =>
			entryIn(tally, "generated/contract.ts").includes(word),
		),
		[],
	);

	const frame = path.join(scratch, "packages/frame");
	layFiles(frame, CLIENT_PACKAGE_FILES);
	const framed = await cli(["packages/frame"], scratch);
	check(
		"a client package, with no module.ts, gets a generated entry of its public ui and lib",
		[framed.code, entryIn(frame), fs.existsSync(path.join(frame, JOINED))],
		[0, CLIENT_PACKAGE_ENTRY, false],
	);

	const leaky = path.join(scratch, "packages/leaky");
	layFiles(leaky, {
		...REQUESTS_FILES,
		"package.json": JSON.stringify({ name: "@fixture/leaky", widgetarium: { level: "domain" } }),
		"features/count/requests.ts": COUNT_REQUESTS.replace(".output(CountSchema)", ".output(Counter)"),
	});
	const leaked = await cli(["packages/leaky"], scratch);
	check(
		"a contract reaching a gateway is refused, naming file, request and import",
		[leaked.code, leaked.said.includes("features/count/requests.ts: the contract of CountQuery uses Counter")],
		[1, true],
	);

	const beside = path.join(scratch, "packages/beside");
	layFiles(beside, {
		...REQUESTS_FILES,
		"package.json": JSON.stringify({ name: "@fixture/beside", widgetarium: { level: "domain" } }),
		"features/count/requests.ts": `const LocalSchema = 1;\n${COUNT_REQUESTS.replace(".output(CountSchema)", ".output(LocalSchema)")}`,
	});
	const besideRun = await cli(["packages/beside"], scratch);
	check(
		"a contract using a schema declared beside it is refused: it belongs in shared/schema",
		[besideRun.code, besideRun.said.includes("uses LocalSchema, declared in that file")],
		[1, true],
	);

	const forms = await generatedIn("forms", {
		"module.ts": moduleListing(".queries(CountQuery).commands(SetCommand)"),
		"features/count/requests.ts": FORMS_REQUESTS,
	});
	check(
		"namespace, default and type imports reach the contract in their own form, a name used only as a type as import type",
		[forms.code, entryIn(path.join(scratch, "packages/forms"), "generated/contract.ts")],
		[0, FORMS_CONTRACT],
	);

	const viewed = await generatedIn("viewed", {
		"module.ts": moduleListing(".queries(ViewQuery)", "./features/view/requests.js"),
		"features/view/requests.tsx": [
			'import { query } from "@widgetarium/core/requests";',
			"",
			'export const ViewQuery = query("tally/view").settlesNow().handle(() => <b>no</b>);',
			"",
		].join("\n"),
	});
	check(
		"a requests.tsx is read with JSX and cut before its handler",
		[viewed.code, entryIn(path.join(scratch, "packages/viewed"), "generated/contract.ts")],
		[
			0,
			`${GENERATED_HEADER}import { query } from "@widgetarium/core/requests";\n\nexport const ViewQuery = query("tally/view").settlesNow();\n`,
		],
	);

	const twice = await generatedIn("twice", {
		"module.ts": moduleListing(".queries(CountQuery, CountQuery).commands(BumpCommand)"),
	});
	check("a request listed twice is refused by name", refusedWith(twice, "TallyModule: CountQuery is listed twice"), [
		1,
		true,
	]);

	const split = await generatedIn("split", {
		"module.ts": [
			'import { module } from "@widgetarium/core/requests";',
			'import { CountQuery } from "./features/count/requests.js";',
			'import { BumpCommand } from "./features/bump/requests.js";',
			"",
			'export const TallyModule = module("tally").queries(CountQuery).commands(BumpCommand).provide((parts: TallyParts) => ({ ...parts }));',
			"",
		].join("\n"),
		"features/count/requests.ts":
			'import { query } from "@widgetarium/core/requests";\nimport { CountSchema as Shape } from "../../shared/schema/count.schema.js";\nexport const CountQuery = query("tally/count").output(Shape);\n',
		"features/bump/requests.ts":
			'import { command, Repeatable } from "@widgetarium/core/requests";\nimport { BumpSchema as Shape } from "../../shared/schema/bump.schema.js";\nexport const BumpCommand = command("tally/bump").input(Shape).idempotencyKey(Repeatable);\n',
		"shared/schema/bump.schema.ts": "export const BumpSchema = 1;\n",
	});
	check(
		"two request files binding one local name to different imports are refused, naming both",
		refusedWith(
			split,
			'the contracts bind Shape to two imports, CountSchema from "../shared/schema/count.schema.js" and BumpSchema from "../shared/schema/bump.schema.js"',
		),
		[1, true],
	);

	const gone = await generatedIn("gone", {
		"module.ts": moduleListing(".queries(CountQuery)", "./features/gone/requests.js"),
	});
	check(
		"a listed file that does not exist is refused by name",
		refusedWith(gone, "features/gone/requests.ts cannot be read"),
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

	const unlisted = await generatedIn("unlisted", { "module.ts": moduleListing(".commands(BumpCommand)") });
	check(
		"a contract using a request of its own file the module does not list says to list it",
		refusedWith(unlisted, "uses CountQuery, a request of that file that module.ts does not list"),
		[1, true],
	);

	const scoped = await generatedIn("scoped", {
		"features/count/requests.ts": COUNT_REQUESTS.replace(
			"(input) => String(input.by)",
			"({ by = fallback }) => String(by)",
		),
	});
	check(
		"a parameter default is read in the scope around the function",
		refusedWith(scoped, "the contract of BumpCommand uses fallback, which that file neither imports nor declares"),
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

const repo = await cli(["--check"], REPO);
const generatedFiles = ["canvas", "fixture-billing"].flatMap((module) =>
	[ENTRY, JOINED].map((entry) => path.join(REPO, "packages", module, entry)),
);
check(
	"every generated file of this repository opens with the generated header",
	generatedFiles.filter((file) => !fs.readFileSync(file, "utf8").startsWith(GENERATED_HEADER)),
	[],
);
check("every domain of this repository has a fresh generated entry", repo.code === 0 ? 0 : repo.said, 0);

console.log(tally.failed ? `generated: ${tally.failed} check(s) failed` : "generated: all checks passed");
process.exit(tally.failed ? 1 : 0);
