import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PlaceEssentialCommand } from "../../../features/essentials/contract.js";
import { PlaceTabCommand, StopTabTearOffCommand, WatchTabTearOffCommand } from "../../../features/tabs/contract.js";
import type { DragSource } from "../tab-drag/sidebar-drop-plan.js";
import { useSidebarDrag } from "../tab-drag/use-sidebar-drag.js";
import { TabDropSchema } from "../../schema/tab-drop.schema.js";

export function useDropPlacing(holder: RefObject<HTMLElement | null>, opensOwnWindows: boolean): void {
	const placeTab = useCommand(PlaceTabCommand);
	const placeEssential = useCommand(PlaceEssentialCommand);
	const watchTearOff = useCommand(WatchTabTearOffCommand);
	const stopTearOff = useCommand(StopTabTearOffCommand);
	useSidebarDrag(holder, {
		opensOwnWindows,
		tearOffOf: (tabId) => ({
			watch: () => void watchTearOff.run({ id: tabId }),
			stop: () => void stopTearOff.run({}),
		}),
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
