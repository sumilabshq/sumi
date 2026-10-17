import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { CallOutputCounts } from "@widgetarium/core/engine/assistant-port.js";
import { outputCountsOf } from "./call-output-counts.js";
import { featuresAllDoneIn, featuresLeftIn, firstBlockerIn } from "./report-said.js";
import type { Tally } from "@widgetarium/core/engine/assistant-cards.js";

export interface CallSeen {
	readonly name?: unknown;
	readonly input?: unknown;
}

export interface AnswerableCall {
	readonly ref: string;
	readonly name: string;
	readonly answered: boolean;
	readonly failed: boolean;
}

export interface CallResult {
	readonly ref: string;
	readonly output: string;
	readonly failed: boolean;
	readonly at?: number;
}

export interface OurCall {
	readonly verb: string;
	readonly said: string;
}

const GLYPH_FOR_TOOL: Readonly<Record<string, string>> = {
	Bash: "terminal",
	BashOutput: "terminal",
	Read: "file",
	NotebookRead: "file",
	Write: "pencil",
	Edit: "pencil",
	NotebookEdit: "pencil",
	Glob: "search",
	Grep: "search",
	WebFetch: "link",
	WebSearch: "link",
	Task: "widget",
	TodoWrite: "check",
	SlashCommand: "menu",
};

const OUR_TOOL = "widgets.mjs";
const PATH_SEGMENTS_SHOWN = 2;
const REPORT_VERB = "report";
const FILE_CHANGING_TOOLS: ReadonlySet<string> = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const CHANGED_PATH_FIELDS = ["file_path", "notebook_path", "path"];
const OUR_TOOL_CALL = /widgets\.mjs\s+([a-z][a-z-]*)((?:"[^"]*"|'[^']*'|\\.|[^;&|<>\n"'])*)/;
const REDIRECTED_STREAM = /\s\d+$/;
const SHELL_ASSIGNMENT = /(?:^|[;&\n]|\s)([A-Za-z_]\w*)=(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g;
const SHELL_VARIABLE = /"\$\{?([A-Za-z_]\w*)\}?"|\$\{?([A-Za-z_]\w*)\}?/g;
const ARGUMENT = /"([^"]*)"|'([^']*)'|((?:\\.|[^\s"'])+)/g;

export function glyphForTool(name: unknown): string {
	return (typeof name === "string" ? GLYPH_FOR_TOOL[name] : undefined) ?? "widget";
}

export function ourCallIn(command: unknown): OurCall | null {
	const said = withShellVariablesExpanded(String(command ?? ""));
	const found = said.match(OUR_TOOL_CALL);
	if (!found) return null;
	const ends = said[(found.index ?? 0) + found[0].length];
	const words = ends === ">" || ends === "<" ? (found[2] ?? "").replace(REDIRECTED_STREAM, "") : (found[2] ?? "");
	return { verb: found[1] ?? "", said: words.trim() };
}

export function ourStepOf({ verb, said }: OurCall): string {
	return `${OUR_TOOL} ${verb} ${said}`.trim();
}

export function shortPathOf(path: string): string {
	return path.split("/").filter(Boolean).slice(-PATH_SEGMENTS_SHOWN).join("/");
}

export function argumentsIn(said: string): string[] {
	return [...said.matchAll(ARGUMENT)].map((found) => found[1] ?? found[2] ?? (found[3] ?? "").replace(/\\(.)/g, "$1"));
}

export const ourCallOf = (call: CallSeen | null | undefined): OurCall | null =>
	call?.name === "Bash" ? ourCallIn(inputOf(call)["command"]) : null;

export function glyphOf(call: CallSeen | null | undefined): string {
	return ourCallOf(call) ? "widget" : glyphForTool(call?.name);
}

export function withResult<Call extends AnswerableCall>(calls: Call[], result: CallResult): Call[] {
	let landed = false;
	const held = calls.map((call) => {
		if (call.ref !== result.ref || call.answered) return call;
		landed = true;
		return answeredWith(call, result);
	});
	return landed ? held : calls;
}

// TRADE-OFF: a report kept before it was counted is counted once on read, from the head line alone, since the rest may be cut
export function reportHeadCountsOf(call: CallSeen, output: string): CallOutputCounts | null {
	const features = isReportCall(call) ? featuresLeftIn(output) : null;
	if (!features) {
		return null;
	}

	const blockedBy = firstBlockerIn(output);
	return blockedBy ? { features, blockedBy } : { features };
}

export function isFileChange(call: CallSeen | null | undefined): boolean {
	return typeof call?.name === "string" && FILE_CHANGING_TOOLS.has(call.name);
}

export function changedPathOf(call: CallSeen | null | undefined): string | null {
	if (!isFileChange(call)) {
		return null;
	}

	const input = inputOf(call);
	const path = CHANGED_PATH_FIELDS.map((field) => input[field]).find((held) => typeof held === "string");
	return typeof path === "string" ? path : null;
}

export function clipLine(text: unknown, longest: number): string {
	const line = (
		String(text ?? "")
			.trim()
			.split("\n")[0] ?? ""
	).trim();
	return line.length > longest ? `${line.slice(0, longest)}…` : line;
}

function inputOf(call: CallSeen | null | undefined): Readonly<Record<string, unknown>> {
	const input = call?.input;
	return isObject(input) ? input : {};
}

function withShellVariablesExpanded(command: string): string {
	const values = new Map(
		[...command.matchAll(SHELL_ASSIGNMENT)].map((found) => [found[1] ?? "", found[2] ?? found[3] ?? found[4] ?? ""]),
	);
	if (values.size === 0) return command;
	return command.replace(SHELL_VARIABLE, (whole: string, quoted?: string, bare?: string) => {
		const value = values.get(quoted ?? bare ?? "");
		if (value === undefined) return whole;
		return quoted === undefined ? value : `"${value}"`;
	});
}

function answeredWith<Call extends AnswerableCall>(call: Call, result: CallResult): Call {
	const outputCounts = result.failed
		? null
		: (outputCountsOf(call.name, result.output) ?? reportCountsOf(call, result.output));
	const answeredAt = result.at ?? 0;
	const answered = { ...call, answered: true, output: result.output, failed: result.failed, answeredAt };
	return outputCounts ? { ...answered, outputCounts } : answered;
}

function reportCountsOf(call: CallSeen, output: string): CallOutputCounts | null {
	return reportHeadCountsOf(call, output) ?? (isReportCall(call) ? featuresFoundOf(featuresAllDoneIn(output)) : null);
}

function isReportCall(call: CallSeen): boolean {
	return ourCallOf(call)?.verb === REPORT_VERB;
}

function featuresFoundOf(features: Tally | null): CallOutputCounts | null {
	return features ? { features } : null;
}
