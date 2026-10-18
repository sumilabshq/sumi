export function isLaidOnScreen(node: HTMLElement | null): boolean {
	if (node === null || !node.isConnected) {
		return false;
	}

	return node.getClientRects().length > 0 && getComputedStyle(node).visibility === "visible";
}
