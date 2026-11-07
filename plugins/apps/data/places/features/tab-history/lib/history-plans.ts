import { heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import { steppedTab } from "../../../shared/lib/tabs/tab-history.js";
import type { TabStep } from "../../../shared/lib/tabs/tab-history.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan } from "../../../shared/lib/settling/settling.js";

const NO_TAB = 'no open tab "{id}"';
const NOWHERE = 'the tab "{id}" has nothing to go {step} to';

export function steppedPlan(id: string, step: TabStep): MomentPlan<null> {
	return (moment) => {
		const tab = heldTabOf(moment, id);

		if (tab === undefined) {
			return refusal(NO_TAB.replace("{id}", id));
		}

		const stepped = steppedTab(tab, step);

		if (stepped === null) {
			return refusal(NOWHERE.replace("{id}", id).replace("{step}", step));
		}

		return movedPlan(
			moment,
			{
				moment: {
					...moment,
					tabs: moment.tabs.map((one) => (one.id === id ? stepped : one)),
				},
				reason: `tab ${id} page ${tab.lastAddress ?? "none"} → ${stepped.lastAddress ?? "none"} (${step})`,
			},
			null,
		);
	};
}
