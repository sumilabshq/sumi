import type { Flow } from "../../schema/flows.schema.js";
import { moving, movedPlan } from "../settling/settling.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import { newTabPlaceOf, openTabUnshown } from "../tabs/host-tabs.js";
import { withFlowChanged } from "./flow-docs.js";
import type { FlowsNow } from "./flow-moves.js";
import { flowPanesOf, flowTabIdsOf } from "./flow-nodes.js";
import { layoutWithTab } from "./flow-panes.js";

export interface HomeTabsFilled extends FlowsNow {
	readonly said: readonly string[];
}

// TRADE-OFF: id copied from command-menu HOME_APP; a domain module cannot import a plugin.
export const HOME_TAB_APP = "home";

const HOME_OPENED = 'flow "{flow}" tabs 0 → 1: home tab {tab} opened in pane {pane}';
const HOME_REFUSED = 'flow "{flow}" holds 0 tabs and no home tab opens: {why}';

export function withHomeTabsInEmptyFlows(now: FlowsNow, apps: PlacedApps): HomeTabsFilled {
	return now.flows.flows
		.filter((flow) => flowTabIdsOf(flow).length === 0)
		.reduce<HomeTabsFilled>((filled, flow) => withHomeTab(filled, flow, apps), { ...now, said: [] });
}

function withHomeTab(filled: HomeTabsFilled, flow: Flow, apps: PlacedApps): HomeTabsFilled {
	const opened = moving(null, apps, (moment) => {
		const home = openTabUnshown(moment, { app: HOME_TAB_APP, pageId: null }, newTabPlaceOf(null));
		return movedPlan(moment, home, home.tab.id);
	})(filled.tabs);

	if (opened.answer.isRefused || opened.next === null) {
		const why = opened.answer.isRefused ? opened.answer.reason : opened.reason;
		return { ...filled, said: [...filled.said, HOME_REFUSED.replace("{flow}", flow.id).replace("{why}", why)] };
	}

	const tabId = opened.answer.value;
	const paneId = flowPanesOf(flow)[0]?.id ?? flow.layout.focusedPaneId;
	const layout = { ...layoutWithTab(flow.layout, tabId, paneId), focusedPaneId: paneId };
	const told = HOME_OPENED.replace("{flow}", flow.id).replace("{tab}", tabId).replace("{pane}", paneId);
	return {
		tabs: opened.next,
		flows: withFlowChanged(filled.flows, flow.id, { layout }),
		said: [...filled.said, told],
	};
}
