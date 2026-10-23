const UNTITLED = "Untitled {n}";
const UNTITLED_NAME = /^Untitled (\d+)$/;

export function untitledNameAfter(names: readonly string[]): string {
	const taken = new Set(names.flatMap((name) => numberIn(name)));
	const free = Array.from({ length: taken.size + 1 }, (_, at) => at + 1).find((n) => !taken.has(n)) ?? 1;
	return UNTITLED.replace("{n}", String(free));
}

function numberIn(name: string): number[] {
	const found = UNTITLED_NAME.exec(name.trim());
	return found?.[1] === undefined ? [] : [Number(found[1])];
}
