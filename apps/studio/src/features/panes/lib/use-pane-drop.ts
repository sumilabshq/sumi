import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { CARRIED_CHAT, CARRIED_PANE, CARRIED_TAB, listenToCarry } from "@widgetarium/behaviors";
import type { CarriedItem, CarryMoment } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/core/requests";
import { sideAt } from "./pane-layout.js";
import type { PaneRect } from "./pane-layout.js";
import { aimTargetIdsOf, homeOfCarried } from "./aim-targets.js";
import type { PaneBoard, PaneLeaf, PanePlacement, PaneView } from "@widgetarium/layout";
import { PlacePaneCommand } from "@widgetarium/layout";

export interface PaneDropAsk {
	readonly board: RefObject<HTMLElement | null>;
	readonly rects: RefObject<ReadonlyMap<string, PaneRect>>;
	readonly leaves: readonly PaneLeaf[];
	readonly groups: PaneBoard["chatGroups"];
}

export interface PaneDrop {
	readonly aim: PanePlacement | null;
	readonly carriedHome: string | null;
}

interface Carrying {
	readonly view: PaneView;
	readonly home: string | null;
	readonly isTab: boolean;
}

const RESTING: PaneDrop = {
	aim: null,
	carriedHome: null,
};

export function usePaneDrop({ board, rects, leaves, groups }: PaneDropAsk): PaneDrop {
	const placePane = useCommand(PlacePaneCommand);
	const [drop, setDrop] = useState<PaneDrop>(RESTING);
	const latest = useRef({ rects, leaves, groups });
	latest.current = { rects, leaves, groups };
	useEffect(
		() =>
			listenToCarry((moment) => {
				const carrying = carryingOf(moment.item, latest.current);
				const aimed = carrying === null ? null : aimOf(board.current, latest.current, moment, carrying);
				const shown: PaneDrop =
					moment.phase === "over" && carrying !== null
						? { aim: aimed, carriedHome: carrying.isTab ? carrying.home : null }
						: RESTING;
				setDrop((was) => (isSameDrop(was, shown) ? was : shown));

				if (aimed === null) {
					return false;
				}

				if (moment.phase === "drop") {
					void placePane.run(aimed).then((answer) => {
						if (!answer.ok) {
							console.error(`[widgetarium] drop on the pane board refused: ${answer.reason}`);
						}
					});
				}

				return true;
			}),
		[board, placePane],
	);
	return drop;
}

function carryingOf(item: CarriedItem, { leaves, groups }: Pick<PaneDropAsk, "leaves" | "groups">): Carrying | null {
	const view = viewOf(item, leaves);
	return view === null
		? null
		: {
				view,
				home: homeOfCarried(item, leaves, groups),
				isTab: item.kind === CARRIED_TAB,
			};
}

function aimOf(
	board: HTMLElement | null,
	{ rects, leaves, groups }: Omit<PaneDropAsk, "board">,
	moment: CarryMoment,
	carrying: Carrying,
): PanePlacement | null {
	if (board === null || moment.phase === "leave") {
		return null;
	}

	const area = board.getBoundingClientRect();
	const x = moment.x - area.left;
	const y = moment.y - area.top;

	if (x < 0 || y < 0 || x > area.width || y > area.height) {
		return null;
	}

	const allowed = new Set(
		aimTargetIdsOf(
			groups,
			leaves.map((leaf) => leaf.id),
			carrying.home,
		),
	);
	const offered = [...rects.current].filter(([id]) => allowed.has(id));

	if (offered.length === 0 && (carrying.home !== null || rects.current.size > 0)) {
		return null;
	}

	return placementOf(aimAt(offered, x, y), carrying);
}

function placementOf(at: Pick<PanePlacement, "targetId" | "side">, { view, home, isTab }: Carrying): PanePlacement {
	const placement = {
		...at,
		view,
	};
	return isTab ? { ...placement, home } : placement;
}

function aimAt(
	rects: readonly (readonly [string, PaneRect])[],
	x: number,
	y: number,
): Pick<PanePlacement, "targetId" | "side"> {
	const nearest = [...rects].sort((one, other) => distanceTo(one[1], x, y) - distanceTo(other[1], x, y))[0];

	if (nearest === undefined) {
		return {
			targetId: null,
			side: "right",
		};
	}

	const [targetId, rect] = nearest;
	return {
		targetId,
		side: sideAt(rect, clamped(x, rect.left, rect.width), clamped(y, rect.top, rect.height)),
	};
}

function isSameDrop(one: PaneDrop, other: PaneDrop): boolean {
	return JSON.stringify(one) === JSON.stringify(other);
}

function distanceTo(rect: PaneRect, x: number, y: number): number {
	const across = Math.max(rect.left - x, 0, x - rect.left - rect.width);
	const down = Math.max(rect.top - y, 0, y - rect.top - rect.height);
	return Math.hypot(across, down);
}

function clamped(value: number, start: number, length: number): number {
	return Math.min(Math.max(value, start), start + length);
}

function viewOf(item: CarriedItem, leaves: readonly PaneLeaf[]): PaneView | null {
	if (item.kind === CARRIED_PANE) {
		return leaves.find((leaf) => leaf.id === item.id)?.view ?? null;
	}

	if (item.kind === CARRIED_TAB) {
		return {
			kind: "app",
			tabId: item.id,
		};
	}

	return item.kind === CARRIED_CHAT ? { kind: "chat", chatId: item.id } : null;
}
