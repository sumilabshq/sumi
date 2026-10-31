export function keptMap<Item>(items: readonly Item[], change: (item: Item) => Item): readonly Item[] {
	const changed = items.map(change);
	return isSameList(changed, items) ? items : changed;
}

export function isSameList<Item>(one: readonly Item[], other: readonly Item[]): boolean {
	return one.length === other.length && one.every((item, at) => item === other[at]);
}
