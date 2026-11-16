import type { AppTabState, TabHolders, TabsSidebar } from "@widgetarium/app-host/contract";
import type { OutputOf } from "@widgetarium/data-framework";
import type { pins } from "@sumi/pins/contract";

export type Pin = OutputOf<typeof pins.pins.all>["pins"][number];

export type PinPlace = "here" | "elsewhere" | "closed";

export interface PinView {
	readonly pin: Pin;
	readonly place: PinPlace;
	readonly window: string | null;
	readonly tab: AppTabState | null;
}

export function pinViewsOf(pinned: readonly Pin[], holders: TabHolders["holders"], sidebar: TabsSidebar | undefined): readonly PinView[] {
	const tabs = sidebar === undefined ? new Map<string, AppTabState>() : tabsOfSidebar(sidebar);
	return pinned.map((pin) => {
		const holder = holders.find((one) => one.id === pin.id);
		const place: PinPlace = holder === undefined || holder.window === null ? "closed" : holder.isHere ? "here" : "elsewhere";
		return {
			pin,
			place,
			window: holder?.window ?? null,
			tab: place === "here" ? (tabs.get(pin.id) ?? null) : null,
		};
	});
}

function tabsOfSidebar(sidebar: TabsSidebar): ReadonlyMap<string, AppTabState> {
	const tabs = sidebar.sections.flatMap(({ entries }) =>
		entries.flatMap((entry) => {
			if (entry.kind === "tab") {
				return [entry.tab];
			}

			if (entry.kind === "group") {
				return entry.group.items.map(({ tab }) => tab);
			}

			return entry.split.members.map((member) => member.item.tab);
		}),
	);
	return new Map(tabs.map((tab) => [tab.id, tab]));
}
