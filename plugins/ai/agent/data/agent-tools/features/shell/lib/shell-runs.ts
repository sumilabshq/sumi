import type { ProcessOutput } from "@sumi/contract";
import { cutLinesOf } from "../../../shared/lib/cut-lines.js";
import type { ShellRun } from "../../../shared/schema/shell.schema.js";

const MOST_LINES = 400;
const ERR_MARK = "[err] ";

export function runIdOf(chat: string, name: string): string {
	return `${chat}.${name}`;
}

export function shellRunOf(name: string, output: ProcessOutput): ShellRun {
	const text = output.lines
		.map(({ stream, text: line }) => (stream === "err" ? `${ERR_MARK}${line}` : line))
		.join("\n");
	return {
		name,
		status: output.status,
		exitCode: output.exitCode,
		...cutLinesOf(text, MOST_LINES, "last"),
		next: output.next,
	};
}
