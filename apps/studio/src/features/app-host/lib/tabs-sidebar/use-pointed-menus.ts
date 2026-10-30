import { useState } from "react";
import { SectionListSchema } from "@widgetarium/app-host";
import type { MouseEvent } from "react";
import { pointedOf } from "./pointed-of.js";
import type { PointedItem } from "./pointed-of.js";

export type PointedOutsideGroup = Exclude<PointedItem, { readonly kind: "group" }>;

export interface PointedMenus {
	readonly pointed: PointedOutsideGroup;
	readonly groupMenuId: string | null;
	readonly openGroupMenu: (groupId: string | null) => void;
	readonly onContextMenu: (event: MouseEvent<HTMLElement>) => void;
}

export function usePointedMenus(): PointedMenus {
	const [pointed, setPointed] = useState<PointedOutsideGroup>(() => ({
		kind: "space",
		list: SectionListSchema.enum.workspace,
	}));
	const [groupMenuId, openGroupMenu] = useState<string | null>(null);
	return {
		pointed,
		groupMenuId,
		openGroupMenu,
		onContextMenu: (event) => pointAt(event, setPointed, openGroupMenu),
	};
}

function pointAt(
	event: MouseEvent<HTMLElement>,
	setPointed: (item: PointedOutsideGroup) => void,
	openGroupMenu: (groupId: string) => void,
): void {
	const item = pointedOf(event.target);

	if (item.kind === "group") {
		event.preventDefault();
		openGroupMenu(item.id);
		return;
	}

	setPointed(item);
}
