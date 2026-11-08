import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runCli } from "../packages/shared/cli/src/run-cli.ts";
import type { CliOutput } from "../packages/shared/cli/src/cli-output.ts";
import { check, tally } from "./check-helpers.ts";

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
const FRAMEWORK_MANIFEST = "packages/shared/data-framework/package.json";
const PASSING_TYPES = "node --version";
const FAILING_TYPES = 'node -e "process.exit(3)"';

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

try {
	await layProbe();
	await checksRenameAcrossPackages();
	await checksClashRefused();
	await checksDryWritesNothing();
	await checksFailedTypeCheckSaid();
	await checksUnknownRefused();
	await checksModuleRenamed();
} finally {
	fs.rmSync(PROBE, { recursive: true, force: true });
}

console.log(tally.failed ? `rename: ${tally.failed} check(s) failed` : "rename: all checks passed");
process.exit(tally.failed ? 1 : 0);

async function layProbe(): Promise<void> {
	fs.mkdirSync(path.join(PROBE, "tools"), { recursive: true });
	writeManifest(PASSING_TYPES);
	writeProbe(FRAMEWORK_MANIFEST, fs.readFileSync(path.join(REPO, FRAMEWORK_MANIFEST), "utf8"));
	const laid = [
		await cli("add", "module", "notes", "--on", "Device"),
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
}

async function checksRenameAcrossPackages(): Promise<void> {
	const unrelatedBefore = md5Of(UNRELATED);
	const renamed = await cli("rename", "notes.files.read-note", "read");
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
		"a wire-name string is rewritten, an unrelated object key is not",
		[probeText(ALIASED).includes('"notes.files.read"'), probeText(ALIASED).includes("{ readNote: 1 }")],
		[true, true],
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
		"generate ran: the contract names the new path",
		probeText("packages/domain/notes/generated/contract.ts").includes('read: named("files.read"'),
		true,
	);
	check(
		"the report names files, uses and the wire name",
		[
			/files changed: \d+, uses changed: \d+/.test(renamed.said),
			renamed.said.includes("wire name: notes.files.read-note → notes.files.read"),
			renamed.said.includes("type check: passed"),
		],
		[true, true, true],
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
		"--dry lists every change",
		[dry.code, dry.said.includes(`${REQUESTS}:`), dry.said.includes("writeNote → store"), dry.said.includes("dry run")],
		[0, true, true, true],
	);
	check("--dry writes nothing", treeMd5(), before);
}

async function checksFailedTypeCheckSaid(): Promise<void> {
	writeManifest(FAILING_TYPES);
	const failed = await cli("rename", "notes.files.write-note", "store");
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

async function checksModuleRenamed(): Promise<void> {
	const renamed = await cli("rename", "notes", "jottings");
	check(
		"a module rename changes its string, its constant, every import of it and its wire-name strings",
		[
			renamed.code,
			probeText("packages/domain/notes/module.ts").includes('export const jottings = module("jottings")'),
			probeText(READER).includes('import { jottings } from "@widgetarium/notes/contract";'),
			probeText(READER).includes("typeof jottings.files.read;"),
			probeText(ALIASED).includes("import { jottings as noteContract }"),
			probeText(ALIASED).includes('"jottings.files.read"'),
		],
		[0, true, true, true, true, true],
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

function probeText(relative: string): string {
	return fs.readFileSync(path.join(PROBE, relative), "utf8");
}

function md5Of(relative: string): string {
	return createHash("md5").update(probeText(relative)).digest("hex");
}

function treeMd5(): string {
	const hash = createHash("md5");

	for (const file of fs.readdirSync(PROBE, { recursive: true, encoding: "utf8" }).sort()) {
		const full = path.join(PROBE, file);

		if (fs.statSync(full).isFile()) {
			hash.update(file).update(fs.readFileSync(full));
		}
	}

	return hash.digest("hex");
}
