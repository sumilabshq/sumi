import { useState } from "react";
import type { MouseEvent } from "react";
import { WORKSPACE_LIST } from "../host-tabs/tab-lists.js";
import { pointedOf } from "./pointed-of.js";
import type { PointedItem } from "./pointed-of.js";

export type PointedOutsideGroup = Exclude<PointedItem, { readonly kind: "group" }>;

export interface PointedMenus {
	readonly pointed: PointedOutsideGroup;
	readonly groupMenuId: string | null;
	readonly openGroupMenu: (groupId: string | null) => void;
	readonly onContextMenu: (event: MouseEvent<HTMLElement>) => void;
}

const NOTHING_POINTED: PointedOutsideGroup = {
	kind: "space",
	list: WORKSPACE_LIST,
};

export function usePointedMenus(): PointedMenus {
	const [pointed, setPointed] = useState<PointedOutsideGroup>(NOTHING_POINTED);
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
