export interface CutLines {
	readonly lines: string[];
	readonly isCut: boolean;
}

export type KeptEnd = "first" | "last";

const LONGEST_LINE = 2000;

export function cutLinesOf(text: string, most: number, kept: KeptEnd): CutLines {
	const lines = linesOf(text);
	const picked = kept === "first" ? lines.slice(0, most) : lines.slice(-most);
	return {
		lines: picked.map(shortLineOf),
		isCut: lines.length > most,
	};
}

function linesOf(text: string): string[] {
	const lines = text.split("\n");
	return lines.at(-1) === "" ? lines.slice(0, -1) : lines;
}

function shortLineOf(line: string): string {
	return line.length > LONGEST_LINE ? `${line.slice(0, LONGEST_LINE)}…` : line;
}
