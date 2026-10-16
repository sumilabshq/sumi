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
