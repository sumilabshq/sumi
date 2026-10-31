type Keyed<Item> = (item: Item) => readonly string[];

type Spot<Item> = (item: Item) => boolean;

export function insertedBefore<Item>(items: readonly Item[], item: Item, isBefore: Spot<Item>): readonly Item[] {
	const at = items.findIndex(isBefore);
	const cut = at === -1 ? items.length : at;
	return [...items.slice(0, cut), item, ...items.slice(cut)];
}

export function keyedSpot<Item>(before: string | null, keysOf: Keyed<Item>): Spot<Item> {
	return (item) => before !== null && keysOf(item).includes(before);
}
