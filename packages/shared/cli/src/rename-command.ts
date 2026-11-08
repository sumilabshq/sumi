import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import { jsonAt } from "@widgetarium/eslint-plugin/workspace";
import type { RenameArgs } from "./rename-args.js";
import { CliRefusal } from "./cli-output.js";
import type { CliOutput } from "./cli-output.js";
import { runGenerate } from "./generate-command.js";
import { scriptChangesOf } from "./rename-edits.js";
import type { ScriptChanges, SourceChange } from "./rename-edits.js";
import { resolverIn } from "./rename-files.js";
import { renamePlan } from "./rename-plan.js";
import type { RenamePlan } from "./rename-plan.js";
import { candidateScripts, sourcesReached, textMentionsIn } from "./rename-scripts.js";
import { workspaceRootAbove } from "./workspace-root.js";

interface FileRewrite {
	readonly file: string;
	readonly text: string;
	readonly uses: number;
}

const CLASH = "{to} is already bound where {from} is used, so the rename would change what code means: {sites}";
const HEADER = "rename {from} → {to} ({oldName} → {newName})";
const CHANGE = "  {file}:{line}  {was} → {text}";
const SUMMARY = "files changed: {files}, uses changed: {uses}";
const WIRE = "wire name: {from} → {to}";
const NO_WIRE = "no wire name: a subscriber is not sent to";
const MENTION = "left as text, not rewritten: {file}:{line}  {said}";
const DRY = "dry run: nothing written";
const GENERATED = "generate: {count} file(s) written";
const TYPES_PASSED = "type check: passed";
const TYPES_FAILED = "type check failed after the rename; git is the undo:\n{said}";
const TYPES_SKIPPED = "type check: skipped (--skip-types)";
const TYPES_SCRIPT = "test:types";
const SHOWN_TAIL_LINES = 40;

export function runRename(args: RenameArgs, output: CliOutput, cwd: string): number {
	const root = workspaceRootAbove(cwd);
	const plan = renamePlan(args, root);
	const resolve = resolverIn(root);
	const scripts = candidateScripts(root, plan);
	const sources = sourcesReached(scripts, plan, resolve);
	const changed = scripts
		.map((script) => scriptChangesOf(script, plan, { resolve, sources }))
		.filter(({ changes, clashLines }) => changes.length > 0 || clashLines.length > 0);
	refuseClashes(changed, plan, root);
	const rewrites = [...changed.map((each) => scriptRewriteOf(each, root)), ...listRewritesOf(plan)];
	output.out(fillTemplate(HEADER, { from: plan.from, to: plan.to, oldName: plan.oldName, newName: plan.newName }));
	changed.forEach((each) => reportChanges(each, root, output));
	plan.lists.forEach(({ file, from, to }) =>
		output.out(fillTemplate(CHANGE, { file: path.relative(root, file), line: "1", was: from, text: to })),
	);
	reportNames(plan, output);
	const scriptTexts = new Map([
		...scripts.map(({ file, text }) => [file, text] as const),
		...rewrites.map(({ file, text }) => [file, text] as const),
	]);
	textMentionsIn(root, plan, scriptTexts).forEach((mention) =>
		output.out(fillTemplate(MENTION, { ...mention, line: String(mention.line) })),
	);

	if (args.isDry) {
		output.out(DRY);
		return 0;
	}

	rewrites.forEach(({ file, text }) => fs.writeFileSync(file, text));
	output.out(fillTemplate(SUMMARY, { files: String(rewrites.length), uses: String(usesOf(rewrites)) }));
	output.out(fillTemplate(GENERATED, { count: String(generatedCount(root)) }));
	return typeCheckReported(root, args.isTypeChecked, output);
}

function refuseClashes(changed: readonly ScriptChanges[], plan: RenamePlan, root: string): void {
	const sites = changed.flatMap(({ file, clashLines }) =>
		[...new Set(clashLines)].map((line) => `${path.relative(root, file)}:${line}`),
	);

	if (sites.length > 0) {
		throw new CliRefusal(fillTemplate(CLASH, { to: plan.newName, from: plan.oldName, sites: sites.join(", ") }));
	}
}

function scriptRewriteOf({ file, changes }: ScriptChanges, root: string): FileRewrite {
	const text = fs.readFileSync(file, "utf8");
	const rewritten = [...changes]
		.sort((one, other) => other.start - one.start)
		.reduce((was, change, at, sorted) => {
			refuseOverlap(change, sorted[at - 1], path.relative(root, file));
			return was.slice(0, change.start) + change.text + was.slice(change.end);
		}, text);
	return {
		file,
		text: rewritten,
		uses: changes.length,
	};
}

function refuseOverlap(change: SourceChange, later: SourceChange | undefined, file: string): void {
	if (later !== undefined && change.end > later.start) {
		throw new CliRefusal(`${file}:${change.line}: two changes overlap; rename found the same use twice`);
	}
}

function listRewritesOf(plan: RenamePlan): FileRewrite[] {
	return plan.lists.map(({ file, from, to }) => ({
		file,
		text: fs.readFileSync(file, "utf8").replaceAll(JSON.stringify(from), JSON.stringify(to)),
		uses: 1,
	}));
}

function reportChanges({ file, changes }: ScriptChanges, root: string, output: CliOutput): void {
	for (const { line, was, text } of changes) {
		output.out(fillTemplate(CHANGE, { file: path.relative(root, file), line: String(line), was, text }));
	}
}

function reportNames(plan: RenamePlan, output: CliOutput): void {
	plan.notes.forEach((note) => output.out(note));

	if (plan.identity !== null) {
		return;
	}

	const [wire] = plan.strings;
	output.out(wire === undefined ? NO_WIRE : fillTemplate(WIRE, { from: wire[0], to: wire[1] }));
}

function usesOf(rewrites: readonly FileRewrite[]): number {
	return rewrites.reduce((sum, { uses }) => sum + uses, 0);
}

function generatedCount(root: string): number {
	const written: string[] = [];
	runGenerate(
		{ modules: [], check: false },
		{
			out: (text) => written.push(text),
			err: (text) => written.push(text),
		},
		root,
	);
	return written.length;
}

function typeCheckReported(root: string, isTypeChecked: boolean, output: CliOutput): number {
	if (!isTypeChecked) {
		output.out(TYPES_SKIPPED);
		return 0;
	}

	const { command, args } = typeCheckOf(root);
	const ran = spawnSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

	if (ran.status === 0) {
		output.out(TYPES_PASSED);
		return 0;
	}

	const said = `${ran.stdout}\n${ran.stderr}`.trim().split("\n").slice(-SHOWN_TAIL_LINES).join("\n");
	output.err(fillTemplate(TYPES_FAILED, { said }));
	return 1;
}

function typeCheckOf(root: string): TypeCheck {
	const manifest = jsonAt(path.join(root, "package.json"));
	const scripts = typeof manifest === "object" && manifest !== null ? Reflect.get(manifest, "scripts") : null;

	if (typeof scripts === "object" && scripts !== null && TYPES_SCRIPT in scripts) {
		return {
			command: "npm",
			args: ["run", "-s", TYPES_SCRIPT],
		};
	}

	return {
		command: "npx",
		args: ["--no-install", "tsc", "--noEmit"],
	};
}

interface TypeCheck {
	readonly command: string;
	readonly args: readonly string[];
}
