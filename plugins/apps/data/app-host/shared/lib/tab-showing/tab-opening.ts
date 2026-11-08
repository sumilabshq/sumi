import { OpenTabCommand as PlacesOpenTabCommand, ShowTabCommand as PlacesShowTabCommand } from "@widgetarium/places";
import type { TabToOpen } from "../../schema/app-tab.schema.js";
import type { TabToShow } from "../../schema/tab-to-show.schema.js";
import { settleAsked } from "./tab-settling.js";
import type { TabsReach } from "./tab-settling.js";

export interface OpenedTab {
	readonly id: string;
}

export async function openTabSettled(reach: TabsReach, asked: TabToOpen): Promise<OpenedTab> {
	const opened = await settleAsked(reach, (at) => reach.send(PlacesOpenTabCommand, { at, ...asked }));
	return { id: opened.id };
}

export async function showTabSettled(reach: TabsReach, asked: TabToShow): Promise<void> {
	await settleAsked(reach, (at) => reach.send(PlacesShowTabCommand, { at, ...asked }));
}
