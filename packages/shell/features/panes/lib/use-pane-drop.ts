import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { CARRIED_CHAT, CARRIED_TAB, isPointInBox, listenToCarry } from "@widgetarium/behaviors";
import type { CarriedItem, CarryMoment } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/core/requests";
import { sideAt } from "../../../shared/lib/pane-layout.js";
import type { PaneRect } from "../../../shared/lib/pane-layout.js";
import type { PaneSide, PaneView } from "../../../shared/schema/pane-tree.schema.js";
import { PlacePaneCommand } from "../contract.js";

export interface PaneAim {
	readonly targetId: string | null;
	readonly side: PaneSide;
	readonly view: PaneView;
}

export interface PaneDropAsk {
	readonly board: RefObject<HTMLElement | null>;
	readonly rects: ReadonlyMap<string, PaneRect>;
}

export function usePaneDrop({ board, rects }: PaneDropAsk): PaneAim | null {
	const placePane = useCommand(PlacePaneCommand);
	const [aim, setAim] = useState<PaneAim | null>(null);
	const latestRects = useRef(rects);
	latestRects.current = rects;
	useEffect(
		() =>
			listenToCarry((moment) => {
				const aimed = aimOf(board.current, latestRects.current, moment);
				setAim(moment.phase === "over" ? aimed : null);
				return aimed !== null && (moment.phase !== "drop" || placed(placePane, aimed));
			}),
		[board, placePane],
	);
	return aim;
}

function placed(placePane: { run(aim: PaneAim): Promise<unknown> }, aim: PaneAim): true {
	void placePane.run(aim);
	return true;
}

function aimOf(board: HTMLElement | null, rects: ReadonlyMap<string, PaneRect>, moment: CarryMoment): PaneAim | null {
	const view = viewOf(moment.item);

	if (board === null || view === null || moment.phase === "leave") {
		return null;
	}

	const area = board.getBoundingClientRect();
	const x = moment.x - area.left;
	const y = moment.y - area.top;

	if (x < 0 || y < 0 || x > area.width || y > area.height) {
		return null;
	}

	return aimAt(rects, x, y, view);
}

function aimAt(rects: ReadonlyMap<string, PaneRect>, x: number, y: number, view: PaneView): PaneAim {
	const hit = [...rects].find(([, rect]) => isPointInBox(rect, x, y));

	if (hit === undefined) {
		return {
			targetId: null,
			side: "right",
			view,
		};
	}

	return {
		targetId: hit[0],
		side: sideAt(hit[1], x, y),
		view,
	};
}

function viewOf(item: CarriedItem): PaneView | null {
	if (item.kind === CARRIED_TAB) {
		return {
			kind: "app",
			tabId: item.id,
		};
	}

	return item.kind === CARRIED_CHAT ? { kind: "chat" } : null;
}
