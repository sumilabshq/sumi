import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PlaceEssentialCommand, PlaceTabCommand, TabDropSchema, TearOffTabCommand } from "@widgetarium/app-host";
import type { DragSource } from "../tab-drag/sidebar-drop-plan.js";
import { useSidebarDrag } from "../tab-drag/use-sidebar-drag.js";
import { useTearOffOverlay } from "../../../browser/lib/use-tear-off-overlay.js";

export function useDropPlacing(holder: RefObject<HTMLElement | null>, opensOwnWindows: boolean): void {
	const placeTab = useCommand(PlaceTabCommand);
	const placeEssential = useCommand(PlaceEssentialCommand);
	const tearOff = useCommand(TearOffTabCommand);
	const tearOffGhost = useTearOffOverlay();
	useSidebarDrag(holder, {
		opensOwnWindows,
		onTearOff: (tabId) =>
			void tearOff.run({ id: tabId }).then((answer) => {
				if (!answer.ok) {
					console.warn(`[widgetarium] tab ${tabId} lifted → resting (tear-off refused: ${answer.reason})`);
				}
			}),
		tearOffGhost,
		onDrop: async (source, drop) => {
			const to = TabDropSchema.safeParse(drop);

			if (!to.success) {
				return refusedDrop(source, to.error.message);
			}

			const placed =
				source.kind === "tab"
					? await placeTab.run({ id: source.id, to: to.data })
					: await placeEssential.run({ id: source.id, to: to.data });
			return placed.ok || refusedDrop(source, placed.reason);
		},
	});
}

function refusedDrop(source: DragSource, reason: string): false {
	console.warn(`[widgetarium] the drop of ${source.kind} ${source.id} is refused: ${reason}`);
	return false;
}
