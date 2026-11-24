import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";
import { check, tally } from "./check-helpers.ts";

const OLD_PLUGIN_IDS = ["tabs-view", "tab-strip", "tabs-sidebar", "panes", "workspace-switcher"];
const FLOW_PLUGIN_IDS = ["flows-sidebar", "flow-strip", "flow-board"];

const resolved = startSumiPlugins(builtInPluginState());

function addedTo(slot: string): readonly (string | undefined)[] {
	return resolved.slotFills.fillOf(slot).added.map(({ name }) => name);
}

function replacementOf(slot: string): string | undefined {
	return resolved.slotFills.fillOf(slot).replacement?.name;
}

check("the built-in profile starts with no refusal", resolved.refusals, []);
check(
	"the Flows sidebar, strip and board start",
	FLOW_PLUGIN_IDS.filter((id) => resolved.startedIds.includes(id)),
	FLOW_PLUGIN_IDS,
);
check(
	"no old tabs, panes or workspace plugin starts",
	OLD_PLUGIN_IDS.filter((id) => resolved.startedIds.includes(id)),
	[],
);
check("the title row holds the sidebar title, then the Flow strip", addedTo("sumi-host.title-tabs"), [
	"SidebarTitle",
	"FlowStrip",
]);
check("the frame start holds the Flows sidebar alone", addedTo("sumi-host.frame-start"), ["FlowsSidebar"]);
check("the pane board is the Flow board", replacementOf("sumi-host.pane-board"), "FlowBoard");
check(
	"the control menu holds no tabs or workspace row",
	[addedTo("control-menu.rows"), addedTo("control-menu.top")],
	[["AssistantRow"], []],
);
console.log(tally.failed ? `flows mount: ${tally.failed} check(s) failed` : "flows mount: all checks passed");
process.exit(tally.failed ? 1 : 0);
