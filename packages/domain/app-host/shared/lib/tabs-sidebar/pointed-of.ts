import { WORKSPACE_LIST } from "../host-tabs/tab-lists.js";

export interface TabRef {
	readonly id: string;
	readonly groupId: string | null;
	readonly list: string;
}

export type PointedItem =
	| {
			readonly kind: "tab";
			readonly id: string;
			readonly groupId: string | null;
			readonly list: string;
	  }
	| {
			readonly kind: "essential";
			readonly id: string;
	  }
	| {
			readonly kind: "group";
			readonly id: string;
			readonly head: HTMLElement;
	  }
	| {
			readonly kind: "space";
			readonly list: string;
	  };

export function pointedOf(target: EventTarget | null): PointedItem {
	const element = target instanceof Element ? target : null;
	const item = element?.closest<HTMLElement>("[data-tabs-item]") ?? null;
	const id = item?.dataset["tabsId"];

	if (item === null || id === undefined) {
		return spaceIn(listIdOf(element));
	}

	return pointedItemOf(item, id);
}

export function listIdOf(element: Element | null): string {
	return element?.closest<HTMLElement>("[data-tabs-in]")?.dataset["tabsIn"] ?? WORKSPACE_LIST;
}

export function groupHeadOf(holder: HTMLElement | null, groupId: string | null): HTMLElement | null {
	if (holder === null || groupId === null) {
		return null;
	}

	return holder.querySelector<HTMLElement>(`[data-tabs-item="group"][data-tabs-id="${CSS.escape(groupId)}"]`);
}

export function tabRefOf(item: HTMLElement, id: string): TabRef {
	return {
		id,
		groupId: item.dataset["tabsGroup"] ?? null,
		list: listIdOf(item),
	};
}

function spaceIn(list: string): PointedItem {
	return {
		kind: "space",
		list,
	};
}

function pointedItemOf(item: HTMLElement, id: string): PointedItem {
	const kind = item.dataset["tabsItem"];

	if (kind === "tab") {
		return pointedTabOf(item, id);
	}

	if (kind === "group") {
		return {
			kind,
			id,
			head: item,
		};
	}

	return kind === "essential" ? { kind, id } : spaceIn(listIdOf(item));
}

function pointedTabOf(item: HTMLElement, id: string): PointedItem {
	return {
		kind: "tab",
		...tabRefOf(item, id),
	};
}
