export function heightAtRest(node: HTMLElement): number {
	const moving = node.getAnimations({ subtree: true }).filter((running) => "transitionProperty" in running);
	const reached = moving.map((running) => running.currentTime);
	moving.forEach((running) => {
		running.currentTime = running.effect?.getComputedTiming().endTime ?? 0;
	});
	const height = node.getBoundingClientRect().height;
	moving.forEach((running, index) => {
		running.currentTime = reached[index] ?? null;
	});
	return height;
}
