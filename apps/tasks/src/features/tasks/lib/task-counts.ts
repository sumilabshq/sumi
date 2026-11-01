import type { Count } from "@widgetarium/tasks";

export function countSaid(words: string, { done, total }: Count): string {
	return words.replace("{done}", String(done)).replace("{total}", String(total));
}

export function shareOf({ done, total }: Count): string {
	return `${total === 0 ? 0 : Math.round((done / total) * 100)}%`;
}

export function statesSaidOf<S extends string>(
	states: readonly S[],
	order: readonly S[],
	words: Readonly<Record<S, string>>,
): string {
	return order
		.flatMap((state) => {
			const count = states.filter((one) => one === state).length;
			return count === 0 ? [] : [`${count} ${words[state]}`];
		})
		.join(" · ");
}
