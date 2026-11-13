import type { FileText } from "../../../shared/schema/files.schema.js";

const NUMBER_WIDTH = 6;

export function numberedLinesOf(text: string, offset: number, limit: number): FileText {
	const all = text.split("\n");
	const picked = all.slice(offset - 1, offset - 1 + limit);
	const last = offset - 1 + picked.length;
	return {
		lines: picked.map((line, at) => `${String(offset + at).padStart(NUMBER_WIDTH)}\t${line}`),
		shown: `lines ${String(offset)}–${String(last)} of ${String(all.length)}`,
	};
}
