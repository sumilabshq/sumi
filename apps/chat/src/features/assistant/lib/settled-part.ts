export interface SaidParts {
	readonly settled: string;
	readonly tail: string;
}

const BLOCK_BREAK = "\n\n";
const FENCE = "```";

// TRADE-OFF: the block boundary is the whole test, so a half-written table or list renders as its own source until the blank line lands
export function settledPart(said: string): SaidParts {
	const fence = unclosedFenceAt(said);
	const breakAt = said.lastIndexOf(BLOCK_BREAK, fence === -1 ? said.length : fence);
	if (breakAt === -1) return { settled: "", tail: said };
	return { settled: said.slice(0, breakAt), tail: said.slice(breakAt + BLOCK_BREAK.length) };
}

function unclosedFenceAt(said: string): number {
	let looked = -1;
	let opened = -1;
	for (;;) {
		const found = said.indexOf(FENCE, looked + 1);
		if (found === -1) return opened;
		opened = opened === -1 ? found : -1;
		looked = found;
	}
}
