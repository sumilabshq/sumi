import type { FileDragState } from "../../../gateways/file-drag/file-drag.gateway.js";
import type { FileDrag, FileDragEvent, PageDrag } from "../../../shared/schema/file-drag.schema.js";

export function heardHostDrag(state: FileDragState, event: FileDragEvent, id: string): FileDragState {
	return {
		...state,
		isHostOver: event.kind === "enter" || event.kind === "over",
		dropped:
			event.kind === "drop"
				? {
						id,
						files: event.files,
						folders: event.folders,
					}
				: state.dropped,
	};
}

export function heardPageDrag(state: FileDragState, drag: PageDrag): FileDragState {
	if (drag === "drop") {
		return {
			...state,
			pageDepth: 0,
		};
	}

	return {
		...state,
		pageDepth: drag === "enter" ? state.pageDepth + 1 : Math.max(0, state.pageDepth - 1),
	};
}

export function fileDragOf(state: FileDragState): FileDrag {
	return {
		isOver: state.pageDepth > 0 || state.isHostOver,
		dropped: state.dropped?.id ?? null,
	};
}

export function isSameFileDrag(was: FileDrag, now: FileDrag): boolean {
	return was.isOver === now.isOver && was.dropped === now.dropped;
}
