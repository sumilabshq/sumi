import type { Mark } from "../../../shared/schema/code-work.schema.js";

export interface MarkAsked {
	readonly from: number;
	readonly to: number | null;
	readonly note: string | null;
}

const PAST_END = "mark {from}–{to} runs past the file's {count} lines";
const BACKWARDS = "mark {from}–{to} ends before it starts";

export function marksOrReasonOf(asked: readonly MarkAsked[], lineCount: number): readonly Mark[] | string {
	const marks: Mark[] = [];

	for (const { from, to, note } of asked) {
		const last = to ?? from;
		const said = (text: string): string =>
			text.replace("{from}", String(from)).replace("{to}", String(last)).replace("{count}", String(lineCount));

		if (last < from) {
			return said(BACKWARDS);
		}

		if (last > lineCount) {
			return said(PAST_END);
		}

		marks.push({ from, to: last, note });
	}

	return marks.sort((one, other) => one.from - other.from);
}
