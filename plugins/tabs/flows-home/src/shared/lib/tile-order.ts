export function orderedBy<Item>(
	items: readonly Item[],
	idOf: (item: Item) => string,
	order: readonly string[],
): readonly Item[] {
	const rankOf = (item: Item): number => {
		const at = order.indexOf(idOf(item));
		return at === -1 ? order.length : at;
	};
	return items
		.map((item, listedAt) => ({ item, listedAt }))
		.sort((first, second) => rankOf(first.item) - rankOf(second.item) || first.listedAt - second.listedAt)
		.map(({ item }) => item);
}

export function movedOnto(ids: readonly string[], id: string, target: string): readonly string[] {
	const targetAt = ids.indexOf(target);

	if (id === target || targetAt === -1 || !ids.includes(id)) {
		return ids;
	}

	const without = ids.filter((each) => each !== id);
	const insertAt = without.indexOf(target) + (ids.indexOf(id) < targetAt ? 1 : 0);
	return [...without.slice(0, insertAt), id, ...without.slice(insertAt)];
}
