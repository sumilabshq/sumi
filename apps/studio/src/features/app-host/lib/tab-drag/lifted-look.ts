import { createContext, useContext, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { TabsSidebar } from "@widgetarium/app-host";
import type { DragPreviewState } from "./drag-preview.js";
import { liftedSplitIdOf } from "./drag-placeholder.js";

export interface LiftedLook {
	readonly ids: ReadonlySet<string>;
	readonly sourceId: string | null;
	readonly splitId: string | null;
	readonly isMarked: boolean;
}

interface TilesAtLift {
	readonly lift: number;
	readonly ids: ReadonlySet<string>;
}

export interface LiftedMark {
	readonly isMarked: boolean;
}

const NOTHING_LIFTED: LiftedLook = {
	ids: new Set(),
	sourceId: null,
	splitId: null,
	isMarked: false,
};

const MARKED: LiftedMark = { isMarked: true };

const UNMARKED: LiftedMark = { isMarked: false };

export const LIFTED_HIDDEN: CSSProperties = { visibility: "hidden" };

export const LiftedContext = createContext<LiftedLook>(NOTHING_LIFTED);

export function useLiftedMark(id: string, splitId: string | null): LiftedMark | null {
	const look = useContext(LiftedContext);

	if (!look.ids.has(id) || (id === look.sourceId && splitId !== look.splitId)) {
		return null;
	}

	return look.isMarked ? MARKED : UNMARKED;
}

export function liftedWithout(look: LiftedLook, id: string): LiftedLook {
	return look.ids.has(id)
		? {
				...look,
				ids: new Set([...look.ids].filter((one) => one !== id)),
			}
		: look;
}

export function useLiftedLook(preview: DragPreviewState | null, sidebar: TabsSidebar): LiftedLook {
	const atLift = useTilesAtLift(preview, sidebar);
	const sourceId = preview?.source.id ?? null;
	const splitId = preview === null ? null : liftedSplitIdOf(preview.source, preview.drop);
	const isMarked = preview?.isMarked ?? false;
	const bornKey = bornTileIdsOf(sidebar, preview?.isLanding === true ? atLift : null).join(",");
	return useMemo(() => liftedLookOf({ sourceId, splitId, isMarked }, bornKey), [sourceId, splitId, isMarked, bornKey]);
}

function useTilesAtLift(preview: DragPreviewState | null, sidebar: TabsSidebar): ReadonlySet<string> | null {
	const tilesAtLift = useRef<TilesAtLift | null>(null);

	if (preview === null) {
		tilesAtLift.current = null;
		return null;
	}

	if (tilesAtLift.current?.lift !== preview.lift) {
		tilesAtLift.current = {
			lift: preview.lift,
			ids: new Set(sidebar.essentials.map((tile) => tile.id)),
		};
	}

	return tilesAtLift.current.ids;
}

function bornTileIdsOf(sidebar: TabsSidebar, atLift: ReadonlySet<string> | null): readonly string[] {
	if (atLift === null) {
		return [];
	}

	return sidebar.essentials.filter((tile) => !atLift.has(tile.id)).map((tile) => tile.id);
}

function liftedLookOf(lifted: Omit<LiftedLook, "ids">, bornKey: string): LiftedLook {
	if (lifted.sourceId === null) {
		return NOTHING_LIFTED;
	}

	return {
		...lifted,
		ids: new Set([lifted.sourceId, ...(bornKey === "" ? [] : bornKey.split(","))]),
	};
}
