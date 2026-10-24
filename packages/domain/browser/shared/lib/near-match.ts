const TYPED_SUFFIXES: ReadonlyMap<string, string> = new Map([
	["co", "com"],
	["cm", "com"],
	["ogr", "org"],
	["nte", "net"],
]);

export function nearMatchOf(host: string, recentHosts: readonly string[]): string | null {
	const typed = host.toLowerCase();

	return recentHosts.find((recent) => isOneEditAway(typed, recent.toLowerCase())) ?? withSuffixFixed(typed);
}

function withSuffixFixed(host: string): string | null {
	const cut = host.lastIndexOf(".");
	const meant = TYPED_SUFFIXES.get(host.slice(cut + 1));

	if (cut <= 0 || meant === undefined) {
		return null;
	}

	return `${host.slice(0, cut)}.${meant}`;
}

function isOneEditAway(typed: string, other: string): boolean {
	if (typed === other || Math.abs(typed.length - other.length) > 1) {
		return false;
	}

	const [shorter, longer] = typed.length <= other.length ? [typed, other] : [other, typed];
	const firstDifference = [...shorter].findIndex((letter, at) => letter !== longer[at]);

	if (firstDifference === -1) {
		return true;
	}

	const skipsInLonger = shorter.length === longer.length ? 1 : 0;

	return shorter.slice(firstDifference + skipsInLonger) === longer.slice(firstDifference + 1);
}
