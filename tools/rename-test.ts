import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runCli } from "../packages/shared/cli/src/run-cli.ts";
import type { CliOutput } from "../packages/shared/cli/src/cli-output.ts";
import { contractListRenamed } from "../packages/shared/cli/src/rename-rewrites.ts";
import { FileTransaction } from "../packages/shared/cli/src/rename-writes.ts";
import { check, thrownBy, tally } from "./check-helpers.ts";

interface CliRun {
	readonly code: number;
	readonly said: string;
}

const REPO = path.resolve(import.meta.dirname, "..");
const PROBE = path.join(REPO, "tools", `.rename-probe-${process.pid}`);
const REQUESTS = "packages/domain/notes/features/files/requests.ts";
const READER = "packages/shared/reader/src/note-reader.ts";
const ALIASED = "packages/shared/reader/src/aliased-reader.ts";
const UNRELATED = "packages/shared/reader/src/unrelated.ts";
const DIRECT = "tools/note-direct.ts";
const CLASHING = "tools/note-clash.ts";
const SHADOW = "tools/note-shadow.ts";
const PLAIN_MODULE = "tools/note-plain.mjs";
const PLAIN_VIEW = "tools/note-view.jsx";
const DOT_SCRIPT = ".storybook/note.ts";
const CLAUDE_NOTE = ".claude/note.md";
const MENTION_DOC = "docs/notes.md";
const UNSAFE = "packages/shared/reader/src/unsafe-reader.ts";
const UNSAFE_VIEW = "packages/shared/reader/src/unsafe-view.tsx";
const BROKEN_MODULE = "packages/domain/drafts";
const PLUGIN = "packages/shared/jotter";
const CONTRACT = "packages/shared/contract";
const CONTRACT_LIST = `${CONTRACT}/sumi-contract.json`;
const FRAMEWORK_MANIFEST = "packages/shared/data-framework/package.json";
const PASSING_TYPES = "node --version";
const FAILING_TYPES = 'node -e "process.exit(3)"';
const RESTORED = "every file is restored";

const READER_SOURCE = `import { notes } from "@widgetarium/notes/contract";

export const reading = notes.files.readNote;

export type ReadNote = typeof notes.files.readNote;

export function shadowed(readNote: string): number {
	return readNote.length;
}
`;
const ALIASED_SOURCE = `import { notes as noteContract } from "@widgetarium/notes/contract";

export const aliased = noteContract.files.readNote;
export const wireName = "notes.files.read-note";
export const keyed = { readNote: 1 };
export const writeWire = "notes.files.write-note";
`;
const UNRELATED_SOURCE = `export function readNote(): string {
	return "unrelated";
}

export const unrelatedUse = readNote();
`;
const DIRECT_SOURCE = `import { readNote } from "../packages/domain/notes/features/files/requests.ts";
import { readNote as noteQuery } from "../packages/domain/notes/features/files/requests.ts";

export const direct = { readNote };
export const viaAlias = noteQuery;
export { readNote };
`;
const CLASHING_SOURCE = `import { writeNote } from "../packages/domain/notes/features/files/requests.ts";

const save = "taken";
export const both = [writeNote, save];
`;
const SHADOW_SOURCE = `export * from "../packages/domain/notes/features/files/requests.ts";
export const writeNote = "local";
`;
const PLAIN_MODULE_SOURCE = `import { notes } from "@widgetarium/notes/contract";

export const plain = notes.files.readNote;
`;
const BARREL = "packages/shared/reader/src/note-barrel.ts";
const BARREL_SOURCE = 'export { notes } from "@widgetarium/notes/contract";\n';
const VIA_BARREL = "packages/shared/reader/src/via-barrel.ts";
const VIA_BARREL_SOURCE = `import { notes } from "./note-barrel.ts";
import * as contract from "@widgetarium/notes/contract";

export const viaBarrel = notes.files.readNote;
export const viaStar = contract.notes.files.readNote;
`;
const PLAIN_VIEW_SOURCE = `import { notes } from "@widgetarium/notes/contract";

export const view = <div>{notes.files.readNote}</div>;
`;
const DOT_SCRIPT_SOURCE = "export const story = notes.files.readNote;\n";
const MENTION_DOC_SOURCE = "x-notes.files.read-note is another module\nnotes.files.read-note reads a note\n";
const UNSAFE_SOURCE = `import { notes } from "@widgetarium/notes/contract";

const key = "read";
export const computed = notes.files[key];
export const literal = notes.files["read"];
export const { read } = notes.files;
const { files } = notes;
export const later = import("@widgetarium/notes/contract");
export * as noteContract from "@widgetarium/notes/contract";
export const viaFiles = files;
const group = notes.files;
export const passed = String(notes.files);
export const asserted = notes.files!.read;
const required = require("@widgetarium/notes/contract");
export const alias = [group, required];
`;
const UNSAFE_VIEW_SOURCE = `import { notes } from "@widgetarium/notes/contract";

export const view = <notes.files.read />;
`;
const BROKEN_MODULE_SOURCE = `import { Anywhere, module } from "@widgetarium/data-framework";

export const drafts = module("drafts").on(Anywhere);
`;
const CONTRACT_LIST_SOURCE = '{\n\t"modules": ["notes"],\n\t"about": "notes"\n}\n';

try {
	await layProbe();
	checksTransactionUnits();
	await checksRenameAcrossPackages();
	await checksClashRefused();
	await checksDryWritesNothing();
	await checksUnsafeUsesRefused();
	await checksWriteFailureRestores();
	await checksGenerateFailureRestores();
	await checksFailedTypeCheckSaid();
	await checksUnknownRefused();
	await checksPluginRefused();
	await checksContractModuleRefused();
	await checksModuleRenamed();
} finally {
	fs.chmodSync(path.join(PROBE, "tools"), 0o755);
	fs.rmSync(PROBE, { recursive: true, force: true });
}

console.log(tally.failed ? `rename: ${tally.failed} check(s) failed` : "rename: all checks passed");
process.exit(tally.failed ? 1 : 0);

async function layProbe(): Promise<void> {
	fs.mkdirSync(path.join(PROBE, "tools"), { recursive: true });
	writeManifest(PASSING_TYPES);
	writeProbe(FRAMEWORK_MANIFEST, fs.readFileSync(path.join(REPO, FRAMEWORK_MANIFEST), "utf8"));
	const laid = [
		await cli("add", "module", "notes", "--on", "Anywhere"),
		await cli("add", "feature", "notes/files", "--query", "readNote", "--command", "writeNote"),
	];
	check(
		"the probe module is laid",
		laid.map(({ code }) => code),
		[0, 0],
	);
	writeManifest(PASSING_TYPES);
	writeProbe(
		"packages/shared/reader/package.json",
		'{ "name": "@probe/reader", "widgetarium": { "level": "common" } }\n',
	);
	writeProbe(READER, READER_SOURCE);
	writeProbe(ALIASED, ALIASED_SOURCE);
	writeProbe(UNRELATED, UNRELATED_SOURCE);
	writeProbe(DIRECT, DIRECT_SOURCE);
	writeProbe(CLASHING, CLASHING_SOURCE);
	writeProbe(SHADOW, SHADOW_SOURCE);
	writeProbe(PLAIN_MODULE, PLAIN_MODULE_SOURCE);
	writeProbe(PLAIN_VIEW, PLAIN_VIEW_SOURCE);
	writeProbe(BARREL, BARREL_SOURCE);
	writeProbe(VIA_BARREL, VIA_BARREL_SOURCE);
	fs.chmodSync(path.join(PROBE, DIRECT), 0o754);
	writeProbe(DOT_SCRIPT, DOT_SCRIPT_SOURCE);
	writeProbe(CLAUDE_NOTE, "notes.files.read-note\n");
	writeProbe(MENTION_DOC, MENTION_DOC_SOURCE);
}

function checksTransactionUnits(): void {
	const kept = path.join(PROBE, "unit", "kept.txt");
	const underAFile = path.join(PROBE, "unit", "kept.txt", "inside.txt");
	writeProbe("unit/kept.txt", "before");
	const refusal = thrownBy(() =>
		new FileTransaction(PROBE).commit([{ file: kept, text: "after", scanned: "scanned" }]),
	);
	check(
		"a file changed since the scan is refused, naming it, and stays as it is",
		[refusal.includes("unit/kept.txt changed since rename read it"), probeText("unit/kept.txt")],
		[true, "before"],
	);
	const transaction = new FileTransaction(PROBE);
	transaction.commit([{ file: kept, text: "after", scanned: "before" }]);
	const landed = probeText("unit/kept.txt");
	const failure = thrownBy(() =>
		transaction.commit([
			{ file: path.join(PROBE, "unit", "added.txt"), text: "added" },
			{ file: underAFile, text: "cannot be written" },
		]),
	);
	const unrestored = transaction.rollbackFailures();
	check(
		"a later commit failing: rollback restores what an earlier commit landed and leaves no staged file",
		[landed, failure !== "", unrestored, probeText("unit/kept.txt"), fs.readdirSync(path.join(PROBE, "unit"))],
		["after", true, [], "before", ["kept.txt"]],
	);
	fs.rmSync(path.join(PROBE, "unit"), { recursive: true });
}

async function checksRenameAcrossPackages(): Promise<void> {
	const unrelatedBefore = md5Of(UNRELATED);
	const generatedBefore = generatedMd5s();
	const renamed = await cli("rename", "notes.files.read-note", "read");
	const generatedChanged = changedCount(generatedBefore, generatedMd5s());
	check("rename answers 0", renamed.code, 0);
	check("the declaration is renamed", probeText(REQUESTS).includes("export const read = query()"), true);
	check("no use of the old constant is left in the module", /\breadNote\b/.test(probeText(REQUESTS)), false);
	check(
		"a namespace use in another package is renamed, in a value and in a type",
		[probeText(READER).includes("notes.files.read;"), probeText(READER).includes("typeof notes.files.read;")],
		[true, true],
	);
	check(
		"a parameter of the same name shadowing nothing of the module is untouched",
		probeText(READER).includes("shadowed(readNote: string): number {\n\treturn readNote.length;"),
		true,
	);
	check("an aliased namespace import is followed", probeText(ALIASED).includes("noteContract.files.read;"), true);
	check(
		"a wire-name string is left as written and listed as a string mention; an unrelated object key is untouched",
		[
			probeText(ALIASED).includes('"notes.files.read-note"'),
			renamed.said.includes(`string mention, not rewritten (pass --strings): ${ALIASED}:4`),
			probeText(ALIASED).includes("{ readNote: 1 }"),
		],
		[true, true, true],
	);
	check(
		"direct imports: shorthand, alias, shorthand property and re-export keep their meaning",
		[
			probeText(DIRECT).includes("import { read } from"),
			probeText(DIRECT).includes("import { read as noteQuery } from"),
			probeText(DIRECT).includes("{ readNote: read }"),
			probeText(DIRECT).includes("export { read };"),
		],
		[true, true, true, true],
	);
	check("a same-named unrelated binding in another file is untouched", md5Of(UNRELATED), unrelatedBefore);
	check(
		"a namespace reached through a barrel and through import * is followed",
		[
			probeText(VIA_BARREL).includes("= notes.files.read;"),
			probeText(VIA_BARREL).includes("= contract.notes.files.read;"),
		],
		[true, true],
	);
	check("a rewritten file keeps its mode", fs.statSync(path.join(PROBE, DIRECT)).mode & 0o777, 0o754);
	check(
		"a .mjs and a .jsx file are renamed like a .ts file",
		[probeText(PLAIN_MODULE).includes("notes.files.read;"), probeText(PLAIN_VIEW).includes("{notes.files.read}")],
		[true, true],
	);
	check(
		"a mention in a dot folder is reported, one in .claude is not",
		[renamed.said.includes(`${DOT_SCRIPT}:1`), renamed.said.includes(CLAUDE_NOTE)],
		[true, false],
	);
	check(
		"a mention preceded by a word or a dash is another name: only the bare one is reported",
		[renamed.said.includes(`${MENTION_DOC}:1`), renamed.said.includes(`${MENTION_DOC}:2`)],
		[false, true],
	);
	check(
		"generate ran: the contract names the new path",
		probeText("packages/domain/notes/generated/contract.ts").includes('read: named("files.read"'),
		true,
	);
	check(
		"the report names files, uses, the wire name and the generated files it really wrote",
		[
			/files changed: \d+, uses changed: \d+/.test(renamed.said),
			renamed.said.includes("wire name: notes.files.read-note → notes.files.read"),
			renamed.said.includes(`generate: ${generatedChanged} file(s) written`),
			generatedChanged > 0,
			renamed.said.includes("type check: passed"),
		],
		[true, true, true, true, true],
	);
}

async function checksClashRefused(): Promise<void> {
	const before = treeMd5();
	const refused = await cli("rename", "notes.files.write-note", "save");
	check(
		"a new name already bound where the old one is used is refused, naming the site",
		[refused.code, refused.said.includes("already bound"), refused.said.includes(`${CLASHING}:`)],
		[1, true, true],
	);
	check("a refused rename writes nothing", treeMd5(), before);
}

async function checksDryWritesNothing(): Promise<void> {
	const before = treeMd5();
	const dry = await cli("rename", "notes.files.write-note", "store", "--dry");
	check(
		"--dry lists every change and every string mention",
		[
			dry.code,
			dry.said.includes(`${REQUESTS}:`),
			dry.said.includes("writeNote → store"),
			dry.said.includes(`string mention, not rewritten (pass --strings): ${ALIASED}:6`),
			dry.said.includes("dry run"),
		],
		[0, true, true, true, true],
	);
	check("--dry writes nothing", treeMd5(), before);
}

async function checksUnsafeUsesRefused(): Promise<void> {
	writeProbe(UNSAFE, UNSAFE_SOURCE);
	writeProbe(UNSAFE_VIEW, UNSAFE_VIEW_SOURCE);
	const before = treeMd5();
	const refused = await cli("rename", "notes.files.read", "fetch");
	check(
		"uses rename cannot follow are refused, each named with file:line and why",
		[
			refused.code,
			refused.said.includes(`${UNSAFE}:4  computed member access`),
			refused.said.includes(`${UNSAFE}:5  computed member access`),
			refused.said.includes(`${UNSAFE}:6  destructuring`),
			refused.said.includes(`${UNSAFE}:7  destructuring`),
			refused.said.includes(`${UNSAFE}:8  a dynamic import`),
			refused.said.includes(`${UNSAFE}:9  export * as`),
			refused.said.includes(`${UNSAFE_VIEW}:3  a JSX member expression`),
			refused.said.includes(`${UNSAFE}:11  the namespace leaves as a value`),
			refused.said.includes(`${UNSAFE}:12  the namespace leaves as a value`),
			refused.said.includes(`${UNSAFE}:13  the namespace leaves as a value`),
			refused.said.includes(`${UNSAFE}:14  a require of the contract`),
		],
		[1, true, true, true, true, true, true, true, true, true, true, true],
	);
	check("a refused unsafe rename writes nothing", treeMd5(), before);
	removeProbe(UNSAFE);
	removeProbe(UNSAFE_VIEW);
}

async function checksWriteFailureRestores(): Promise<void> {
	const before = treeMd5();
	fs.chmodSync(path.join(PROBE, "tools"), 0o555);
	const failed = await cli("rename", "notes.files.read", "fetch");
	fs.chmodSync(path.join(PROBE, "tools"), 0o755);
	check(
		"a write failing on one file restores every file and says so",
		[failed.code, failed.said.includes(`writing the rename failed, ${RESTORED}`), treeMd5() === before],
		[1, true, true],
	);
}

async function checksGenerateFailureRestores(): Promise<void> {
	writeProbe(`${BROKEN_MODULE}/package.json`, '{ "name": "@probe/drafts", "widgetarium": { "level": "domain" } }\n');
	writeProbe(`${BROKEN_MODULE}/module.ts`, BROKEN_MODULE_SOURCE);
	writeProbe(`${BROKEN_MODULE}/features/drafts/requests.ts`, "export const = ;\n");
	const before = treeMd5();
	const failed = await cli("rename", "notes.files.read", "fetch");
	check(
		"generate failing after the sources were written restores sources and generated files and says so",
		[
			failed.code,
			failed.said.includes(`generate failed after the rename, ${RESTORED}`),
			treeMd5() === before,
			probeText(REQUESTS).includes("export const read = query()"),
		],
		[1, true, true, true],
	);
	removeProbe(BROKEN_MODULE);
}

async function checksFailedTypeCheckSaid(): Promise<void> {
	writeManifest(FAILING_TYPES);
	const failed = await cli("rename", "notes.files.write-note", "store", "--strings");
	writeManifest(PASSING_TYPES);
	check(
		"a failed type check after writing is said, and the rename stays written",
		[
			failed.code,
			failed.said.includes("type check failed"),
			probeText(REQUESTS).includes("export const store = command()"),
		],
		[1, true, true],
	);
	check("--strings rewrites a wire-name string", probeText(ALIASED).includes('"notes.files.store"'), true);
	check(
		"a local in a file re-exporting the source with export * shadows it and is not renamed",
		probeText(SHADOW),
		SHADOW_SOURCE,
	);
}

async function checksUnknownRefused(): Promise<void> {
	const before = treeMd5();
	const runs = [await cli("rename", "notes.files.nothing", "x"), await cli("rename", "notes.files.read", "Bad")];
	check(
		"an unknown target and a name that is not a segment are refused",
		runs.map(({ code, said }) => [code, said.includes("nothing is named") || said.includes("not a name segment")]),
		[
			[1, true],
			[1, true],
		],
	);
	check("and write nothing", treeMd5(), before);
}

async function checksPluginRefused(): Promise<void> {
	writeProbe(`${PLUGIN}/package.json`, '{ "name": "@probe/jotter", "widgetarium": { "level": "plugin" } }\n');
	writeProbe(`${PLUGIN}/src/plugin.ts`, 'export const jotter = plugin("jotter");\n');
	const before = treeMd5();
	const refused = await cli("rename", "jotter", "scribe", "--plugin");
	check(
		"a plugin rename is refused: its state is keyed by plugin id",
		[refused.code, refused.said.includes("sumi.plugins.json keys its state by plugin id"), treeMd5() === before],
		[1, true, true],
	);
	removeProbe(PLUGIN);
}

async function checksContractModuleRefused(): Promise<void> {
	writeProbe(`${CONTRACT}/package.json`, '{ "name": "@probe/contract", "widgetarium": { "level": "contract" } }\n');
	writeProbe(CONTRACT_LIST, CONTRACT_LIST_SOURCE);
	const before = treeMd5();
	const refused = await cli("rename", "notes", "jottings");
	check(
		"a module in a sumi-contract.json is refused without --breaking-contract, naming the list",
		[refused.code, refused.said.includes(`listed in ${CONTRACT_LIST}`), refused.said.includes("--breaking-contract")],
		[1, true, true],
	);
	check("and writes nothing", treeMd5(), before);
	const broken = await cli("rename", "notes", "jottings", "--breaking-contract");
	check(
		"--breaking-contract passes the refusal; generate, which finds a contract module by folder name, fails and every file is restored",
		[
			broken.code,
			broken.said.includes("listed in"),
			broken.said.includes(`generate failed after the rename, ${RESTORED}`),
			treeMd5() === before,
		],
		[1, false, true, true],
	);
	check(
		"sumi-contract.json changes only inside its modules list",
		JSON.parse(contractListRenamed(CONTRACT_LIST_SOURCE, { from: "notes", to: "jottings" })),
		{ modules: ["jottings"], about: "notes" },
	);
	removeProbe(CONTRACT);
}

async function checksModuleRenamed(): Promise<void> {
	const renamed = await cli("rename", "notes", "jottings");
	check(
		"a module rename changes its string, its constant and every import of it; wire-name strings are listed",
		[
			renamed.code,
			probeText("packages/domain/notes/module.ts").includes('export const jottings = module("jottings")'),
			probeText(READER).includes('import { jottings } from "@widgetarium/notes/contract";'),
			probeText(READER).includes("typeof jottings.files.read;"),
			probeText(ALIASED).includes("import { jottings as noteContract }"),
			probeText(ALIASED).includes('"notes.files.read-note"'),
			renamed.said.includes(`string mention, not rewritten (pass --strings): ${ALIASED}:6`),
		],
		[0, true, true, true, true, true, true],
	);
}

function writeManifest(typeCheck: string): void {
	const file = path.join(PROBE, "package.json");
	const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
	const manifest = {
		...kept,
		name: "rename-probe",
		private: true,
		type: "module",
		workspaces: ["packages/domain/*", "packages/shared/*"],
		scripts: { "test:types": typeCheck },
	};
	fs.writeFileSync(file, `${JSON.stringify(manifest, null, "\t")}\n`);
}

async function cli(...argv: string[]): Promise<CliRun> {
	const said: string[] = [];
	const output: CliOutput = {
		out: (text) => said.push(text),
		err: (text) => said.push(text),
	};
	const code = await runCli(argv, output, PROBE);
	return { code, said: said.join("\n") };
}

function writeProbe(relative: string, text: string): void {
	fs.mkdirSync(path.dirname(path.join(PROBE, relative)), { recursive: true });
	fs.writeFileSync(path.join(PROBE, relative), text);
}

function removeProbe(relative: string): void {
	fs.rmSync(path.join(PROBE, relative), { recursive: true });
}

function probeText(relative: string): string {
	return fs.readFileSync(path.join(PROBE, relative), "utf8");
}

function md5Of(relative: string): string {
	return createHash("md5").update(probeText(relative)).digest("hex");
}

function probeFiles(): string[] {
	return fs
		.readdirSync(PROBE, { recursive: true, encoding: "utf8" })
		.sort()
		.filter((file) => fs.statSync(path.join(PROBE, file)).isFile());
}

function generatedMd5s(): Map<string, string> {
	return new Map(
		probeFiles()
			.filter((file) => file.split(path.sep).includes("generated"))
			.map((file) => [file, md5Of(file)]),
	);
}

function changedCount(before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): number {
	const files = new Set([...before.keys(), ...after.keys()]);
	return [...files].filter((file) => before.get(file) !== after.get(file)).length;
}

function treeMd5(): string {
	const hash = createHash("md5");

	for (const file of probeFiles()) {
		hash.update(file).update(fs.readFileSync(path.join(PROBE, file)));
	}

	return hash.digest("hex");
}
