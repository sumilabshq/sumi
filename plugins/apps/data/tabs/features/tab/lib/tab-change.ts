import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { listOfPlace, placeOfList, placeTabs, spotOfTab } from "../../../shared/lib/tab-places.js";
import type { Sidebar } from "../../../shared/lib/tab-lists.js";
import type { TabNow, TabUpdate } from "../../../shared/schema/tab-asks.schema.js";

type TabSpot = NonNullable<ReturnType<typeof spotOfTab>>;
type ListPlace = Parameters<typeof placeTabs>[2];

export interface TabChange {
	readonly send: Send;
	readonly chatId: string;
	readonly spot: TabSpot;
}

export async function renameTab({ send, chatId, spot }: TabChange, title: string | undefined): Promise<void> {
	if (title === undefined) {
		return;
	}

	await send(appHost.tabActions.renameTab, { id: spot.id, label: title });
	console.info(`[widgetarium] tab ${spot.id} title ${spot.title} → ${title} (chat ${chatId})`);
}

export async function moveTab({ send, chatId, spot }: TabChange, asked: TabUpdate): Promise<void> {
	const move = placementOf(spot, asked, asked.place === undefined ? null : listOfPlace(asked.place, chatId));

	if (move === null) {
		return;
	}

	await placeTabs(send, [spot.id], move);
	console.info(
		`[widgetarium] tab ${spot.id} ${spot.list}/${spot.groupId ?? "-"} → ${move.list}/${move.groupId ?? "-"} before ${move.before ?? "the end"} (chat ${chatId})`,
	);
}

export function tabNowOf(sidebar: Sidebar, { chatId, spot }: TabChange): TabNow {
	const now = spotOfTab(sidebar, spot.id) ?? spot;
	return {
		id: spot.id,
		title: now.title,
		address: now.address,
		place: placeOfList(now.list, chatId),
		groupId: now.groupId,
	};
}

function placementOf(spot: TabSpot, { group, before }: TabUpdate, list: string | null): ListPlace | null {
	if (list === null && group === undefined && before === undefined) {
		return null;
	}

	const placedList = list ?? spot.list;
	return {
		list: placedList,
		groupId: group === undefined ? keptGroupOf(spot, placedList) : group,
		before: before ?? null,
	};
}

function keptGroupOf(spot: TabSpot, list: string): string | null {
	return list === spot.list ? spot.groupId : null;
}
