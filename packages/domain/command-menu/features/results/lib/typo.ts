const WORD_EDGE = /[\s·/._-]+/;
const SHORTEST_FORGIVEN = 3;
const LONG_WORD = 7;

export function isNearTitle(typed: string, title: string): boolean {
	const typedWords = typed.split(WORD_EDGE).filter((word) => word !== "");
	const titleWords = title.toLowerCase().split(WORD_EDGE);
	return (
		typedWords.length > 0 && typedWords.every((word) => titleWords.some((titleWord) => isNearWord(word, titleWord)))
	);
}

function isNearWord(typed: string, word: string): boolean {
	if (typed.length < SHORTEST_FORGIVEN) {
		return word.startsWith(typed);
	}

	const forgiven = typed.length >= LONG_WORD ? 2 : 1;
	const lengths = [typed.length - 1, typed.length, typed.length + 1];
	return lengths.some((length) => editsBetween(typed, word.slice(0, length)) <= forgiven);
}

interface Words {
	readonly one: string;
	readonly other: string;
}

interface Cell {
	readonly at: number;
	readonly column: number;
}

function editsBetween(one: string, other: string): number {
	const rows: (readonly number[])[] = [];

	for (let at = 0; at <= one.length; at += 1) {
		const row: number[] = [];

		for (let column = 0; column <= other.length; column += 1) {
			row.push(at === 0 || column === 0 ? at + column : cheapestEdit([...rows, row], { one, other }, { at, column }));
		}

		rows.push(row);
	}

	return rows.at(-1)?.at(-1) ?? Number.POSITIVE_INFINITY;
}

function cheapestEdit(rows: readonly (readonly number[])[], { one, other }: Words, { at, column }: Cell): number {
	const swapped = one[at - 1] === other[column - 1] ? 0 : 1;
	const best = Math.min(
		(rows[at - 1]?.[column] ?? 0) + 1,
		(rows[at]?.[column - 1] ?? 0) + 1,
		(rows[at - 1]?.[column - 1] ?? 0) + swapped,
	);
	const isTransposed = at > 1 && column > 1 && one[at - 1] === other[column - 2] && one[at - 2] === other[column - 1];
	return isTransposed ? Math.min(best, (rows[at - 2]?.[column - 2] ?? 0) + 1) : best;
}
