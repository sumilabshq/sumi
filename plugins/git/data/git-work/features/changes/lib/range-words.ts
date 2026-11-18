export interface RangeAsk {
	readonly folder: string;
	readonly only: string | null;
	readonly base: string | null;
	readonly head: string | null;
}

const UNCOMMITTED = "uncommitted";
const LAST_COMMIT = "HEAD";
const SHORT_SHA = /^[0-9a-f]{12,40}$/;

export function rangeLabelOf({ only, base, head }: RangeAsk): string {
	if (only === UNCOMMITTED) {
		return "Uncommitted";
	}

	if (only !== null) {
		return shortOf(only);
	}

	return `${shortOf(base ?? LAST_COMMIT)} → ${head === null ? "checked out" : shortOf(head)}`;
}

export function gitLinkOf({ folder, only, base, head }: RangeAsk): string {
	const asked = new URLSearchParams();

	if (head !== null) {
		asked.set("head", head);
	}

	if (base !== null) {
		asked.set("base", base);
	}

	if (only !== null) {
		asked.set("only", only);
	}

	const query = asked.toString();
	return query === "" ? `sumi://git/${folder}` : `sumi://git/${folder}?${query}`;
}

function shortOf(revision: string): string {
	return SHORT_SHA.test(revision) ? revision.slice(0, 7) : revision;
}
