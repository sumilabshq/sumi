import { MAIN_STUDIO_WINDOW, labelOfPlacesWindow } from "@widgetarium/behaviors";
import type { MovePlacedTabs } from "../settling/settling.js";
import { viewsSettled } from "./tab-leases.js";

export function windowJoined(label: string, at: number): MovePlacedTabs<null> {
	return (placed) => {
		if (placed.windows.some((open) => open.label === label)) {
			return { next: null, reason: `${label} is open already`, answer: null };
		}

		const joined = { ...placed, windows: [...placed.windows, { label, openedAt: at }] };
		return {
			next: { ...joined, views: viewsSettled(joined) },
			reason: `windows ${placed.windows.length} → ${joined.windows.length} (${label} opened; it holds no tab another window shows)`,
			answer: null,
		};
	};
}

export function windowsLeft(isGone: (label: string) => boolean, why: string): MovePlacedTabs<null> {
	return (placed) => {
		const gone = placed.windows.filter(({ label }) => isGone(label)).map(({ label }) => label);
		const goneViews = Object.keys(placed.views).filter((window) => {
			const label = labelOfPlacesWindow(window);
			return label !== MAIN_STUDIO_WINDOW && isGone(label);
		});

		if (gone.length === 0 && goneViews.length === 0) {
			return { next: null, reason: `no window ${why}`, answer: null };
		}

		const kept = placed.windows.filter(({ label }) => !isGone(label));
		return {
			next: {
				...placed,
				windows: kept,
				views: Object.fromEntries(Object.entries(placed.views).filter(([window]) => !goneViews.includes(window))),
			},
			reason: `windows ${placed.windows.length} → ${kept.length} (${[...gone, ...goneViews].join(", ")} ${why}; their tabs stay in the workspace, free)`,
			answer: null,
		};
	};
}
