import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { CARRIED_CHAT, CARRIED_PANE, CARRIED_TAB, listenToCarry } from "@widgetarium/behaviors";
import type { CarriedItem, CarryMoment } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/core/requests";
import { sideAt } from "./pane-layout.js";
import type { PaneRect } from "./pane-layout.js";
import type { PaneLeaf, PanePlacement, PaneView } from "@widgetarium/layout";
import { PlacePaneCommand } from "@widgetarium/layout";

export interface PaneDropAsk {
	readonly board: RefObject<HTMLElement | null>;
	readonly rects: ReadonlyMap<string, PaneRect>;
	readonly leaves: readonly PaneLeaf[];
}

export function usePaneDrop({ board, rects, leaves }: PaneDropAsk): PanePlacement | null {
	const placePane = useCommand(PlacePaneCommand);
	const [aim, setAim] = useState<PanePlacement | null>(null);
	const latest = useRef({ rects, leaves });
	latest.current = { rects, leaves };
	useEffect(
		() =>
			listenToCarry((moment) => {
				const aimed = aimOf(board.current, latest.current, moment);
				setAim(moment.phase === "over" ? aimed : null);

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
	return aim;
}

function aimOf(
	board: HTMLElement | null,
	{ rects, leaves }: Omit<PaneDropAsk, "board">,
	moment: CarryMoment,
): PanePlacement | null {
	const view = viewOf(moment.item, leaves);

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

function aimAt(rects: ReadonlyMap<string, PaneRect>, x: number, y: number, view: PaneView): PanePlacement {
	const nearest = [...rects].sort((one, other) => distanceTo(one[1], x, y) - distanceTo(other[1], x, y))[0];

	if (nearest === undefined) {
		return {
			targetId: null,
			side: "right",
			view,
		};
	}

	const [targetId, rect] = nearest;
	return {
		targetId,
		side: sideAt(rect, clamped(x, rect.left, rect.width), clamped(y, rect.top, rect.height)),
		view,
	};
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

	return item.kind === CARRIED_CHAT ? { kind: "chat" } : null;
}
