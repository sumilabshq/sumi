export const LABELLED_TAB_PX = 132;
export const ICON_TAB_PX = 30;
export const CONTROL_PX = 30;

export interface FitAsk {
	readonly width: number;
	readonly tabIds: readonly string[];
	readonly activeId: string | null;
}

export interface TabFit {
	readonly shown: readonly string[];
	readonly hidden: readonly string[];
	readonly labelled: ReadonlySet<string>;
}

export function tabFitOf({ width, tabIds, activeId }: FitAsk): TabFit {
	const hasRoomForLabels = width <= 0 || tabIds.length * LABELLED_TAB_PX + CONTROL_PX <= width;

	if (hasRoomForLabels) {
		return {
			shown: tabIds,
			hidden: [],
			labelled: new Set(tabIds),
		};
	}

	return narrowFitOf({ width, tabIds, activeId });
}

function narrowFitOf({ width, tabIds, activeId }: FitAsk): TabFit {
	const active = activeId !== null && tabIds.includes(activeId) ? activeId : null;
	const others = tabIds.filter((id) => id !== active);
	const room = width - CONTROL_PX - (active === null ? 0 : LABELLED_TAB_PX);
	const kept = new Set(others.slice(0, iconSlotsOf(room, others.length)));
	return {
		shown: tabIds.filter((id) => id === active || kept.has(id)),
		hidden: tabIds.filter((id) => id !== active && !kept.has(id)),
		labelled: new Set(active === null ? [] : [active]),
	};
}

function iconSlotsOf(room: number, count: number): number {
	if (Math.floor(room / ICON_TAB_PX) >= count) {
		return count;
	}

	return Math.max(0, Math.floor((room - CONTROL_PX) / ICON_TAB_PX));
}
