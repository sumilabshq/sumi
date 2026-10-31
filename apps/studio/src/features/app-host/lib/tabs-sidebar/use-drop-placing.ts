import type { RefObject } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PlaceEssentialCommand, PlaceGroupCommand, PlaceTabCommand, TabDropSchema } from "@widgetarium/app-host";
import type { TabDrop } from "@widgetarium/app-host";
import type { DragSource } from "../tab-drag/drag-source.js";
import type { SidebarDragParts } from "../tab-drag/sidebar-drag-parts.js";
import { useSidebarDrag } from "../tab-drag/use-sidebar-drag.js";
import { useTearOffOverlay } from "../../../browser/lib/use-tear-off-overlay.js";
import { useTearsOffRows } from "./use-tears-off-rows.js";

type DropPlacers = ReturnType<typeof useDropPlacers>;

type GroupSource = Extract<DragSource, { kind: "group" }>;

const GROUP_DROP = "a group stands only in a list, never in a group, a split or Essentials";

export function useDropPlacing(
	holder: RefObject<HTMLElement | null>,
	opensOwnWindows: boolean,
	parts: SidebarDragParts,
): void {
	useSidebarDrag(holder, {
		parts,
		opensOwnWindows,
		onTearOff: useTearsOffRows(),
		tearOffGhost: useTearOffOverlay(),
		onDrop: usePlacesDrops(),
	});
}

function usePlacesDrops(): (source: DragSource, drop: TabDrop) => Promise<boolean> {
	const placers = useDropPlacers();
	return (source, drop) => placeDrop(placers, source, drop);
}

function useDropPlacers() {
	return {
		placeTab: useCommand(PlaceTabCommand),
		placeEssential: useCommand(PlaceEssentialCommand),
		placeGroup: useCommand(PlaceGroupCommand),
	};
}

async function placeDrop(placers: DropPlacers, source: DragSource, drop: TabDrop): Promise<boolean> {
	const to = TabDropSchema.safeParse(drop);

	if (!to.success) {
		return refusedDrop(source, to.error.message);
	}

	if (source.kind === "group") {
		return placeGroupDrop(placers, source, to.data);
	}

	const placed =
		source.kind === "tab"
			? await placers.placeTab.run({ id: source.id, to: to.data })
			: await placers.placeEssential.run({ id: source.id, to: to.data });
	return placed.ok || refusedDrop(source, placed.reason);
}

async function placeGroupDrop({ placeGroup }: DropPlacers, source: GroupSource, to: TabDrop): Promise<boolean> {
	if (to.kind !== "list" || to.groupId !== null) {
		return refusedDrop(source, GROUP_DROP);
	}

	const placed = await placeGroup.run({ id: source.id, to: { list: to.list, before: to.before } });
	return placed.ok || refusedDrop(source, placed.reason);
}

function refusedDrop(source: DragSource, reason: string): false {
	console.warn(`[widgetarium] the drop of ${source.kind} ${source.id} is refused: ${reason}`);
	return false;
}
