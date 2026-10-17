import type { CallOutputCounts } from "@widgetarium/core/engine/assistant-port.js";

type OutputCounter = (output: string) => CallOutputCounts | null;

const NUMBERED_LINE = /^\s*\d+(?:\t|→)/gm;
const FOUND_SAID = /^Found (\d+) /;
const NO_FILES = "No files found";
const ABSOLUTE_PATH_LINE = /^\//gm;

const OUTPUT_COUNTERS: ReadonlyMap<string, OutputCounter> = new Map([
	["Read", linesReadIn],
	["Grep", hitsSaidIn],
	["Glob", pathsFoundIn],
]);

// TRADE-OFF: counted when the result lands, because the transcript keeps only the head of an output and a count read later would be the head's
export function outputCountsOf(tool: string, output: string): CallOutputCounts | null {
	return OUTPUT_COUNTERS.get(tool)?.(output) ?? null;
}

function linesReadIn(output: string): CallOutputCounts | null {
	const lines = output.match(NUMBERED_LINE)?.length ?? 0;
	return lines > 0 ? { lines } : null;
}

function hitsSaidIn(output: string): CallOutputCounts | null {
	const said = FOUND_SAID.exec(output);
	return said ? { hits: Number(said[1]) } : null;
}

function pathsFoundIn(output: string): CallOutputCounts | null {
	if (output.startsWith(NO_FILES)) {
		return { hits: 0 };
	}

	const hits = output.match(ABSOLUTE_PATH_LINE)?.length ?? 0;
	return hits > 0 ? { hits } : null;
}
