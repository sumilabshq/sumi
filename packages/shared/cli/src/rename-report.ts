import path from "node:path";
import { fillTemplate } from "@widgetarium/eslint-plugin/fill-template";
import type { CliOutput } from "./cli-output.js";
import type { ScriptChanges, SourceChange } from "./rename-edits.js";
import type { ParsedScript } from "./rename-files.js";
import type { RenamePlan } from "./rename-plan.js";
import type { FileRewrite } from "./rename-rewrites.js";
import { modulesListLineOf } from "./rename-rewrites.js";
import { lineKeyOf, textMentionsIn } from "./rename-scripts.js";

export interface RenameRun {
	readonly root: string;
	readonly output: CliOutput;
}

export interface MentionSources {
	readonly scripts: readonly ParsedScript[];
	readonly changed: readonly ScriptChanges[];
	readonly rewrites: readonly FileRewrite[];
}

const HEADER = "rename {from} → {to} ({oldName} → {newName})";
const CHANGE = "  {file}:{line}  {was} → {text}";
const WIRE = "wire name: {from} → {to}";
const NO_WIRE = "no wire name: a subscriber is not sent to";
const STRING_MENTION = "string mention, not rewritten (pass --strings): {file}:{line}  {said}";
const MENTION = "left as text, not rewritten: {file}:{line}  {said}";

export function reportPlan(plan: RenamePlan, changed: readonly ScriptChanges[], { root, output }: RenameRun): void {
	output.out(fillTemplate(HEADER, { from: plan.from, to: plan.to, oldName: plan.oldName, newName: plan.newName }));
	changed.forEach(({ file, changes }) => reportChanges(path.relative(root, file), changes, output));
	plan.lists.forEach(({ file, from, to }) => {
		const line = String(modulesListLineOf(file));
		output.out(fillTemplate(CHANGE, { file: path.relative(root, file), line, was: from, text: to }));
	});
	reportNames(plan, output);
}

export function reportMentions(plan: RenamePlan, sources: MentionSources, { root, output }: RenameRun): void {
	const stringMentions = sources.changed.flatMap(({ file, text, stringLines }) =>
		stringLines.map((line) => ({ file: path.relative(root, file), line, said: lineTextOf(text, line) })),
	);
	stringMentions.forEach((mention) =>
		output.out(fillTemplate(STRING_MENTION, { ...mention, line: String(mention.line) })),
	);
	const scriptTexts = new Map([
		...sources.scripts.map(({ file, text }) => [file, text] as const),
		...sources.rewrites.map(({ file, text }) => [file, text] as const),
	]);
	const shownLines = new Set(stringMentions.map(({ file, line }) => lineKeyOf(file, line)));
	textMentionsIn(root, plan, { scriptTexts, shownLines }).forEach((mention) =>
		output.out(fillTemplate(MENTION, { ...mention, line: String(mention.line) })),
	);
}

function reportChanges(file: string, changes: readonly SourceChange[], output: CliOutput): void {
	for (const { line, was, text } of changes) {
		output.out(fillTemplate(CHANGE, { file, line: String(line), was, text }));
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

function lineTextOf(text: string, line: number): string {
	return (text.split("\n")[line - 1] ?? "").trim();
}
