import type { RowKind } from "../../../shared/schema/command-menu.schema.js";
import type { Found } from "./found.js";

const WORD_EDGE = /[\s·/._-]+/;
const NO_MATCH = -1;
const KIND_RANK: Readonly<Partial<Record<RowKind, number>>> = {
	tab: 0,
	site: 1,
	chat: 1,
	app: 2,
	workspace: 3,
	command: 4,
};
const LAST_RANK = 9;

export function bestOf(pools: readonly (readonly Found[])[], typed: string): Found | null {
	return rankedOf(pools.flat(), typed)[0] ?? null;
}

export function rankedOf(pool: readonly Found[], typed: string): readonly Found[] {
	return pool
		.map((found) => ({
			found,
			score: scoreOf(found, typed),
		}))
		.filter(({ score }) => score !== NO_MATCH)
		.sort((one, other) => one.score - other.score || kindRankOf(one.found) - kindRankOf(other.found))
		.map(({ found }) => found);
}

function scoreOf(found: Found, typed: string): number {
	if (typed === "") {
		return 0;
	}

	const title = found.title.toLowerCase();

	if (title.startsWith(typed)) {
		return 0;
	}

	if (title.split(WORD_EDGE).some((word) => word.startsWith(typed))) {
		return 1;
	}

	if (title.includes(typed)) {
		return 2;
	}

	return found.haystack.toLowerCase().includes(typed) ? 3 : NO_MATCH;
}

function kindRankOf(found: Found): number {
	return KIND_RANK[found.kind] ?? LAST_RANK;
}
