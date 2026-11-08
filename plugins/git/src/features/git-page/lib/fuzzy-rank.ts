const CHARS_PER_MISTAKE = 4;
const MISTAKE_WEIGHT = 10_000;
const NAME_HIT = 0;
const PATH_HIT = 1_000;
const SCATTERED_HIT = 2_000;
const SEPARATOR = "/";

export function fuzzyRankOf(text: string, query: string): number | null {
	const needle = query.trim().toLowerCase();

	if (needle === "") {
		return 0;
	}

	const haystack = text.toLowerCase();
	const mistakes = needle.length - commonSubsequenceLength(needle, haystack);

	if (mistakes > Math.floor(needle.length / CHARS_PER_MISTAKE)) {
		return null;
	}

	return mistakes * MISTAKE_WEIGHT + closenessOf(haystack, needle) + haystack.length;
}

export function fuzzyFiltered<T>(items: readonly T[], query: string, textOf: (item: T) => string): T[] {
	return items
		.map((item, index) => ({
			item,
			index,
			rank: fuzzyRankOf(textOf(item), query),
		}))
		.filter((ranked): ranked is { item: T; index: number; rank: number } => ranked.rank !== null)
		.sort((one, other) => one.rank - other.rank || one.index - other.index)
		.map(({ item }) => item);
}

function closenessOf(haystack: string, needle: string): number {
	if (haystack.slice(haystack.lastIndexOf(SEPARATOR) + 1).includes(needle)) {
		return NAME_HIT;
	}

	return haystack.includes(needle) ? PATH_HIT : SCATTERED_HIT;
}

function commonSubsequenceLength(needle: string, haystack: string): number {
	let above = new Array<number>(haystack.length + 1).fill(0);

	for (const char of needle) {
		const row = [0];

		for (let at = 1; at <= haystack.length; at += 1) {
			const isSame = haystack[at - 1] === char;
			row.push(isSame ? (above[at - 1] ?? 0) + 1 : Math.max(above[at] ?? 0, row[at - 1] ?? 0));
		}

		above = row;
	}

	return above[haystack.length] ?? 0;
}
