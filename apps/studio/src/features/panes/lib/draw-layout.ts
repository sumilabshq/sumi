import { draggedLayoutOf, panePlacesOf } from "./pane-layout.js";
import type { DraggedLayoutAsk, PaneEdge, PanePlace } from "./pane-layout.js";

// TRADE-OFF: an edge drag writes pane styles straight to the DOM, so a drag renders no plate until release
export function drawLayout(board: HTMLElement, ask: DraggedLayoutAsk): void {
	placePanes(board, panePlacesOf(ask));
	placeEdges(board, draggedLayoutOf(ask).edges);
}

function placePanes(board: HTMLElement, places: ReadonlyMap<string, PanePlace>): void {
	for (const pane of board.querySelectorAll<HTMLElement>("[data-pane-id]")) {
		const place = places.get(pane.dataset["paneId"] ?? "");

		if (place === undefined) {
			continue;
		}

		pane.style.left = place.left;
		pane.style.top = place.top;
		pane.style.width = place.width;
		pane.style.height = place.height;
	}
}

function placeEdges(board: HTMLElement, edges: readonly PaneEdge[]): void {
	for (const edge of edges) {
		const element = board.querySelector<HTMLElement>(`[data-pane-edge="${CSS.escape(`${edge.splitId}:${edge.at}`)}"]`);
		element?.style.setProperty("left", `${edge.rect.left}px`);
		element?.style.setProperty("top", `${edge.rect.top}px`);
	}
}
