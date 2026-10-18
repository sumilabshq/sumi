import type { RefObject } from "react";
import { useTreeDrag } from "@widgetarium/behaviors";
import type { TreeDrag } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/core/requests";
import type { AppTabState } from "../../../shared/schema/app-tab.schema.js";
import { groupOfPinned } from "../../../shared/lib/tab-drag/tab-groups.js";
import { MoveTabCommand } from "../contract.js";

const NO_DEPTH_CHANGE_PX = 100_000;

export function useTabDrag(holder: RefObject<HTMLElement | null>, tabs: readonly AppTabState[]): TreeDrag {
	const moveTab = useCommand(MoveTabCommand);
	return useTreeDrag(holder, {
		indent: NO_DEPTH_CHANGE_PX,
		rebuilt: tabs,
		onDrop: ({ dragged, parent, before }) =>
			void moveTab.run({
				id: dragged,
				before,
				isPinned: parent === groupOfPinned(true),
			}),
	});
}
