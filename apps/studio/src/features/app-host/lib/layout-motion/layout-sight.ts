const MOVED =
	"[data-tabs-item=tab], [data-tabs-item=essential], [data-tabs-box], [data-tabs-split], [data-tabs-section], [data-host-column-add], [data-tabs-card]";

export interface Seen {
	readonly element: HTMLElement;
	readonly placed: string;
	readonly left: number;
	readonly top: number;
	readonly height: number;
}

export type Sight = ReadonlyMap<string, Seen>;

export function sightOf(holder: HTMLElement | null): Sight {
	const seen = new Map<string, Seen>();

	if (holder === null) {
		return seen;
	}

	const keyed = [...holder.querySelectorAll<HTMLElement>(MOVED)].map((element) => ({
		element,
		key: keyOf(element),
	}));
	const keys = keyed.map(({ key }) => key);

	for (const { element, key } of keyed) {
		const placed = `${placeOf(element)}>${key}`;
		const isTwin = keys.indexOf(key) !== keys.lastIndexOf(key);
		seen.set(freeKeyOf(seen, isTwin ? placed : key), seenOf(element, placed));
	}

	return seen;
}

export function seenPlacedAs(sight: Sight, placed: string): Seen | undefined {
	return [...sight.values()].find((seen) => seen.placed === placed);
}

function seenOf(element: HTMLElement, placed: string): Seen {
	const box = element.getBoundingClientRect();
	return {
		element,
		placed,
		left: box.left,
		top: box.top,
		height: box.height,
	};
}

function placeOf(element: HTMLElement): string {
	const split = element.parentElement?.closest<HTMLElement>("[data-tabs-split]");

	if (split !== null && split !== undefined) {
		return `split:${split.dataset["tabsSplit"] ?? ""}`;
	}

	return `list:${element.parentElement?.closest<HTMLElement>("[data-tabs-list]")?.dataset["tabsList"] ?? ""}`;
}

function keyOf(element: HTMLElement): string {
	if (element.hasAttribute("data-tabs-card")) {
		return cardKeyOf(element);
	}

	const { tabsId, tabsBox, tabsSplit, tabsSection, hostColumnAdd } = element.dataset;
	return `${tabsId ?? ""}|${tabsBox ?? ""}|${tabsSplit ?? ""}|${tabsSection ?? ""}|${hostColumnAdd ?? ""}`;
}

function cardKeyOf(card: HTMLElement): string {
	return `card:${card.querySelector<HTMLElement>("[data-tabs-chat]")?.dataset["tabsId"] ?? ""}`;
}

function freeKeyOf(seen: ReadonlyMap<string, Seen>, key: string): string {
	let free = key;

	for (let copy = 2; seen.has(free); copy += 1) {
		free = `${key}#${copy}`;
	}

	return free;
}
