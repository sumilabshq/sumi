export type PointedItem =
	| {
			readonly kind: "tab";
			readonly id: string;
			readonly groupId: string | null;
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
	| { readonly kind: "space" };

const SPACE: PointedItem = {
	kind: "space",
};

export function pointedOf(target: EventTarget | null): PointedItem {
	const item = target instanceof Element ? target.closest<HTMLElement>("[data-tabs-item]") : null;
	const id = item?.dataset["tabsId"];

	if (item === null || id === undefined) {
		return SPACE;
	}

	return pointedItemOf(item, id);
}

export function groupHeadOf(holder: HTMLElement | null, groupId: string | null): HTMLElement | null {
	if (holder === null || groupId === null) {
		return null;
	}

	return holder.querySelector<HTMLElement>(`[data-tabs-item="group"][data-tabs-id="${CSS.escape(groupId)}"]`);
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

	return kind === "essential" ? { kind, id } : SPACE;
}

function pointedTabOf(item: HTMLElement, id: string): PointedItem {
	return {
		kind: "tab",
		id,
		groupId: item.dataset["tabsGroup"] ?? null,
	};
}
