import type { TabRef } from "../tab-drag/tab-ref.js";

export type PointedItem =
	| (TabRef & { readonly kind: "tab" })
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
	const list = element?.closest<HTMLElement>("[data-tabs-in]")?.dataset["tabsIn"];

	if (list === undefined) {
		throw new Error("[widgetarium] a tab list was pointed outside the tabs sidebar");
	}

	return list;
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
		isChat: item.dataset["tabsChat"] !== undefined,
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
