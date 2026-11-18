export interface LineMark {
	readonly from: number;
	readonly to: number;
	readonly note: string | null;
}

const LINE = ".sumi-code-line";
const MARKED = "is-marked";
const NOTE = "sumi-file-card-mark-note";

export function linesMarked(holder: HTMLElement, marks: readonly LineMark[]): HTMLElement | null {
	const lines = [...holder.querySelectorAll<HTMLElement>(LINE)];

	for (const { from, to, note } of marks) {
		lines.slice(from - 1, to).forEach((line) => line.classList.add(MARKED));
		const last = lines[to - 1];

		if (note !== null && last !== undefined) {
			const said = holder.ownerDocument.createElement("div");
			said.className = NOTE;
			said.textContent = note;
			last.after(said);
		}
	}

	const first = marks[0];
	return first === undefined ? null : (lines[first.from - 1] ?? null);
}
