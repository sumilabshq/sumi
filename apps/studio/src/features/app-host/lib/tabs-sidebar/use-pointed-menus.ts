import { useState } from "react";
import { SectionListSchema } from "@widgetarium/app-host/contract";
import type { MouseEvent } from "react";
import { pointedOf } from "./pointed-of.js";
import type { PointedItem } from "./pointed-of.js";

export interface PointedMenus {
	readonly pointed: PointedItem;
	readonly onContextMenu: (event: MouseEvent<HTMLElement>) => void;
}

export function usePointedMenus(): PointedMenus {
	const [pointed, setPointed] = useState<PointedItem>(() => ({
		kind: "space",
		list: SectionListSchema.enum.workspace,
	}));
	return {
		pointed,
		onContextMenu: (event) => setPointed(pointedOf(event.target)),
	};
}
