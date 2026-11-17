import type { MovePlacedTabs } from "../../../shared/lib/settling/settling.js";
import { WindowViewSchema } from "../../../shared/schema/tabs.schema.js";

export function leftHiddenMoved(window: string, isHidden: boolean): MovePlacedTabs<string> {
	return (placed) => {
		const view = placed.views[window] ?? WindowViewSchema.parse({ shownId: null });
		const was = view.leftHidden ?? null;

		if (was === isHidden) {
			const skipped = `${window} left side hidden ${String(was)} skipped: unchanged`;
			return { next: null, reason: skipped, answer: skipped };
		}

		const reason = `${window} left side hidden ${String(was)} → ${String(isHidden)} (asked)`;
		return {
			next: {
				...placed,
				views: {
					...placed.views,
					[window]: {
						...view,
						leftHidden: isHidden,
					},
				},
			},
			reason,
			answer: reason,
		};
	};
}
