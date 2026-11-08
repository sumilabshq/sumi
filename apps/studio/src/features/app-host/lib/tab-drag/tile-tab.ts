import type { AppTabState, EssentialTile } from "@widgetarium/app-host";

const TAB_OF_TILE = {
	app: "browser",
	subtitle: null,
	status: null,
	label: null,
	address: null,
	isInOwnWindow: false,
	mark: "none",
	isNestable: true,
	isTearable: true,
} as const satisfies Partial<AppTabState>;

export function tileOfTab(tab: AppTabState): EssentialTile {
	return {
		id: tab.id,
		title: tab.title,
		icon: tab.icon,
		favicon: tab.favicon,
		isShown: tab.isShown,
		isLive: true,
	};
}

export function tabOfTile(tile: EssentialTile): AppTabState {
	return {
		...TAB_OF_TILE,
		id: tile.id,
		title: tile.title,
		icon: tile.icon,
		favicon: tile.favicon,
		isShown: tile.isShown,
	};
}
