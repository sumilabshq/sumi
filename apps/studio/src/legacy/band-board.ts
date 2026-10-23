import { bound } from "./shared/board-bindings.js";
import type { Binding } from "./shared/board-bindings.js";

type Mounted = {
	readonly name: string;
	readonly widget: string;
	readonly props: Readonly<Record<string, Binding>>;
};

const MENU_TILE = "studio-menu";

export function menuBoardOf(app: string): Record<string, unknown> {
	return soleTileBoardOf(MENU_TILE, controlMenuOf(app));
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
