import type { PaneLayout, PaneRect } from "../../../shared/lib/pane-layout.js";

// TRADE-OFF: an edge drag writes pane styles straight to the DOM, so a drag renders no plate until release
export function drawLayout(board: HTMLElement, layout: PaneLayout): void {
	for (const pane of board.querySelectorAll<HTMLElement>("[data-pane-id]")) {
		const rect = layout.rects.get(pane.dataset["paneId"] ?? "");

		if (rect !== undefined) {
			placeAt(pane, rect);
		}
	}

	for (const edge of layout.edges) {
		const element = board.querySelector<HTMLElement>(`[data-pane-edge="${CSS.escape(`${edge.splitId}:${edge.at}`)}"]`);
		element?.style.setProperty("left", `${edge.rect.left}px`);
		element?.style.setProperty("top", `${edge.rect.top}px`);
	}
}

function placeAt(element: HTMLElement, rect: PaneRect): void {
	element.style.left = `${rect.left}px`;
	element.style.top = `${rect.top}px`;
	element.style.width = `${rect.width}px`;
	element.style.height = `${rect.height}px`;
}
