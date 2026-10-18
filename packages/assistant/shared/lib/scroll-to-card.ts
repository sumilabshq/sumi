export function scrollToCard(chatRoot: HTMLElement | null, key: string): void {
	const card = [...(chatRoot?.querySelectorAll<HTMLElement>("[data-build-key]") ?? [])].find(
		(node) => node.dataset["buildKey"] === key,
	);
	card?.scrollIntoView({ behavior: "smooth", block: "start" });
}
