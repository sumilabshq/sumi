import type { TabHistory } from "../../schema/tabs.schema.js";
import type { HostTab } from "./host-tabs-moment.js";

export type TabStep = "back" | "forward";

const MOST_STEPS_KEPT = 50;
const EMPTY_HISTORY: TabHistory = {
	back: [],
	forward: [],
};

export function historyOf(tab: HostTab): TabHistory {
	return tab.history ?? EMPTY_HISTORY;
}

export function canStep(tab: HostTab, step: TabStep): boolean {
	return historyOf(tab)[step].length > 0;
}

export function pushedTab(tab: HostTab, address: string): HostTab {
	const { back } = historyOf(tab);
	return {
		...tab,
		lastAddress: address,
		lastTitle: null,
		history: {
			back: [...back, tab.lastAddress ?? ""].slice(-MOST_STEPS_KEPT),
			forward: [],
		},
	};
}

export function steppedTab(tab: HostTab, step: TabStep): HostTab | null {
	const { back, forward } = historyOf(tab);
	const here = tab.lastAddress ?? "";

	if (step === "back") {
		const to = back.at(-1);
		return to === undefined
			? null
			: {
					...tab,
					lastAddress: to,
					lastTitle: null,
					history: {
						back: back.slice(0, -1),
						forward: [here, ...forward],
					},
				};
	}

	const to = forward[0];
	return to === undefined
		? null
		: {
				...tab,
				lastAddress: to,
				lastTitle: null,
				history: {
					back: [...back, here].slice(-MOST_STEPS_KEPT),
					forward: forward.slice(1),
				},
			};
}
