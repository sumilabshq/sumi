import type { Blocker, Tally } from "@widgetarium/core/engine/assistant-cards.js";
import type { ReportRow } from "./report-command.js";

const ALL_DONE = "Every kept feature is built, checked and placed.";
const SOME_LEFT = "{left} of {all} features are not done:";
const SOME_LEFT_SAID = new RegExp(`^${SOME_LEFT.replace("{left}", "(\\d+)").replace("{all}", "(\\d+)")}`);
const DONE_MARK = "  ✓ ";
const LEFT_MARK = "  ✗ ";
const PROBLEM_INDENT = "      ";
const WHERE_MARK = " — ";

export function reportText(rows: readonly ReportRow[]): string {
	const left = rows.filter((row) => row.problems.length > 0);
	const head =
		left.length === 0
			? ALL_DONE
			: SOME_LEFT.replace("{left}", String(left.length)).replace("{all}", String(rows.length));
	return [head, ...rows.map(rowText)].join("\n");
}

export function featuresLeftIn(said: string): Tally | null {
	const left = SOME_LEFT_SAID.exec(said);
	if (!left) {
		return null;
	}

	const notDone = Number(left[1]);
	const all = Number(left[2]);
	return notDone <= all ? { passed: all - notDone, all } : null;
}

export function featuresAllDoneIn(said: string): Tally | null {
	if (!said.startsWith(ALL_DONE)) {
		return null;
	}

	const all = said.split("\n").filter((line) => line.startsWith(DONE_MARK)).length;
	return { passed: all, all };
}

export function firstBlockerIn(said: string): Blocker | null {
	const lines = said.split("\n");
	const at = lines.findIndex((line) => line.startsWith(LEFT_MARK));
	const why = lines[at + 1];
	if (at === -1 || why === undefined || !why.startsWith(PROBLEM_INDENT)) {
		return null;
	}

	const feature = (lines[at] ?? "").slice(LEFT_MARK.length).split(WHERE_MARK)[0] ?? "";
	return { feature: feature.trim(), why: why.trim() };
}

function rowText(row: ReportRow): string {
	const where = row.widget && row.note ? `${WHERE_MARK}${row.widget} on ${row.note}` : "";
	if (row.problems.length === 0) return `${DONE_MARK}${row.feature}${where}`;
	return [`${LEFT_MARK}${row.feature}${where}`, ...row.problems.map((problem) => `${PROBLEM_INDENT}${problem}`)].join(
		"\n",
	);
}
