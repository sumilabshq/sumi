import type { DiffLine, FileDiff, Hunk } from "@sumi/git";

export type DiffRow =
	| {
			readonly kind: "gap";
			readonly hidden: number;
	  }
	| {
			readonly kind: "line";
			readonly line: DiffLine["kind"];
			readonly oldNo: number | null;
			readonly newNo: number | null;
			readonly text: string;
	  };

const LINE_PX = 20;
const CONTEXT_LINES = 6;
const MAX_PLACEHOLDER_LINES = 4000;

export function placeholderHeightOf({ added, removed }: FileDiff): number {
	return Math.min(added + removed + CONTEXT_LINES, MAX_PLACEHOLDER_LINES) * LINE_PX;
}

export function diffRowsOf(hunks: readonly Hunk[]): DiffRow[] {
	const rows: DiffRow[] = [];
	let shownTo = 1;

	for (const hunk of hunks) {
		const hidden = hunk.oldStart > 0 ? hunk.oldStart - shownTo : 0;

		if (hidden > 0) {
			rows.push({
				kind: "gap",
				hidden,
			});
		}

		let oldNo = hunk.oldStart;
		let newNo = hunk.newStart;

		for (const { kind, text } of hunk.lines) {
			rows.push({
				kind: "line",
				line: kind,
				oldNo: kind === "added" ? null : oldNo,
				newNo: kind === "removed" ? null : newNo,
				text,
			});
			oldNo += kind === "added" ? 0 : 1;
			newNo += kind === "removed" ? 0 : 1;
		}

		shownTo = oldNo;
	}

	return rows;
}
