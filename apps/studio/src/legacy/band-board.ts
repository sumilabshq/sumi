import { bound, keptValue } from "./shared/board-bindings.js";
import type { Binding } from "./shared/board-bindings.js";
import type { OpenablePanel } from "@widgetarium/core/engine/studio-state-port.js";

export type Mounted = {
	readonly name: string;
	readonly widget: string;
	readonly props: Readonly<Record<string, Binding>>;
};

type PanelButton = {
	readonly name: string;
	readonly label: string;
	readonly icon: string;
	readonly panel: OpenablePanel;
};

const BAND_TILE = "studio-band";

export type BandCorner = "start" | "end";

export function cornerItemsOf(app: string, corner: BandCorner): readonly Mounted[] {
	return corner === "start"
		? [safeAreaAt("left"), controlMenuOf(app)]
		: [WIDGETS_BUTTON, AI_BUTTON, safeAreaAt("right")];
}

export function cornerBoardOf(app: string, corner: BandCorner): Record<string, unknown> {
	const items = cornerItemsOf(app, corner);
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
		layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: BAND_TILE, surface: "none" }] }] },
	};
}

export function mountRowOf({ name, widget }: Mounted): { readonly name: string; readonly widget: string } {
	return { name, widget };
}

const WIDGETS_BUTTON = panelButtonOf({
	name: "Widgets button",
	label: "Widgets",
	icon: "layout-grid",
	panel: "catalogue",
});

const AI_BUTTON = panelButtonOf({ name: "AI button", label: "AI assistant", icon: "sparkles", panel: "assistant" });

function panelButtonOf({ name, label, icon, panel }: PanelButton): Mounted {
	return {
		name,
		widget: "@studio/panel-button",
		props: {
			getLabel: keptValue(label),
			getIcon: keptValue(icon),
			getIsOpen: bound("@studio/is-panel-open", { panel }),
			togglePanel: bound("@studio/toggle-panel", { panel }),
		},
	};
}

function controlMenuOf(app: string): Mounted {
	return {
		name: "Control menu",
		widget: "@studio/control-menu",
		props: {
			getCurrentApp: bound("@studio/current-app", { app }),
			getApps: bound("@studio/apps"),
			openApp: bound("@studio/open-app"),
			createApp: bound("@studio/create-app"),
			editInCanvas: bound("@studio/edit-in-canvas"),
			getIsInCanvas: bound("@studio/is-in-canvas"),
			backToView: bound("@studio/back-to-view"),
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
