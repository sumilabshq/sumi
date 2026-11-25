export function wantsScale(panel: HTMLElement): boolean {
	return getComputedStyle(panel).getPropertyValue("--pop-motion").trim() === "scale";
}

export function scaleOut(done: () => void): () => void {
	done();
	return () => undefined;
}
