import { bound, keptValue } from "./shared/board-bindings.js";
import type { Binding } from "./shared/board-bindings.js";

export type Mounted = {
	readonly name: string;
	readonly widget: string;
	readonly props: Readonly<Record<string, Binding>>;
};

const BAND_TILE = "studio-band";

const MENU_TILE = "studio-menu";

const RAIL_TILE = "studio-rail";

export type BandCorner = "start" | "end";

export type ShellPlace = BandCorner | "menu" | "rail";

export function shellBoardOf(app: string, place: ShellPlace): Record<string, unknown> {
	if (place === "start" || place === "end") {
		return cornerBoardOf(place);
	}

	return place === "menu"
		? soleTileBoardOf(MENU_TILE, controlMenuOf(app))
		: soleTileBoardOf(RAIL_TILE, workspaceRailOf(app));
}

export function mountRowOf({ name, widget }: Mounted): { readonly name: string; readonly widget: string } {
	return { name, widget };
}

function cornerItemsOf(corner: BandCorner): readonly Mounted[] {
	return [safeAreaAt(corner === "start" ? "left" : "right")];
}

function cornerBoardOf(corner: BandCorner): Record<string, unknown> {
	const items = cornerItemsOf(corner);
	return {
		v: 2,
		tiles: [
			{
				id: BAND_TILE,
				widget: "@studio/band",
				props: {},
				mounts: { start: [], end: [], [corner]: items.map(mountRowOf) },
				mounted: Object.fromEntries(items.map(({ name, widget, props }) => [name, { widget, props }])),
			},
		],
		layout: soleTileLayoutOf(BAND_TILE),
	};
}

function soleTileBoardOf(id: string, { widget, props }: Mounted): Record<string, unknown> {
	return {
		v: 2,
		tiles: [
			{
				id,
				widget,
				props,
			},
		],
		layout: soleTileLayoutOf(id),
	};
}

function soleTileLayoutOf(id: string): Record<string, unknown> {
	return {
		dir: "row",
		of: [keptColumnOf(id)],
	};
}

function keptColumnOf(id: string): Record<string, unknown> {
	const bareTile = {
		id,
		surface: "none",
	};
	return {
		dir: "column",
		keep: true,
		of: [bareTile],
	};
}

function controlMenuOf(app: string): Mounted {
	return {
		name: "Control menu",
		widget: "@studio/control-menu",
		props: {
			getCurrentApp: bound("@studio/current-app", { app }),
			editInCanvas: bound("@studio/edit-in-canvas"),
			getIsInCanvas: bound("@studio/is-in-canvas"),
			backToView: bound("@studio/back-to-view"),
			getAgentSetup: bound("@studio/agent-setup"),
			chooseProvider: bound("@studio/choose-provider"),
			setHelperAgents: bound("@studio/set-helper-agents"),
			openProviders: bound("@studio/open-providers"),
			clearChat: bound("@studio/clear-chat"),
		},
	};
}

function workspaceRailOf(app: string): Mounted {
	return {
		name: "Workspace rail",
		widget: "@studio/workspace-rail",
		props: {
			getCurrentApp: bound("@studio/current-app", { app }),
			getApps: bound("@studio/apps"),
			openApp: bound("@studio/open-app"),
			createApp: bound("@studio/create-app"),
			renameApp: bound("@studio/rename-app"),
		},
	};
}

function safeAreaAt(side: "left" | "right"): Mounted {
	return {
		name: `Safe area ${side}`,
		widget: "@studio/safe-area",
		props: { getSide: keptValue(side) },
	};
}
