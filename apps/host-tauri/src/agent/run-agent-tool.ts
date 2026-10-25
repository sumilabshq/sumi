import { tabAccess, tabRead } from "./read-tools.js";
import { appState, appsList } from "./state-tools.js";
import { groupCreate, groupDelete, groupUpdate, tabClose, tabDuplicate, tabOpen, tabUpdate } from "./tab-tools.js";
import type { ToolContext } from "./tool-places.js";

type AgentTool = (context: ToolContext, input: unknown) => Promise<unknown>;

const UNKNOWN_TOOL = "Sumi has no tool named {tool}.";

export const AGENT_TOOLS: Readonly<Record<string, AgentTool>> = {
	app_state: appState,
	apps_list: appsList,
	tab_open: tabOpen,
	tab_duplicate: tabDuplicate,
	tab_update: tabUpdate,
	tab_close: tabClose,
	tab_access: tabAccess,
	tab_read: tabRead,
	group_create: groupCreate,
	group_update: groupUpdate,
	group_delete: groupDelete,
};

export function runAgentTool(context: ToolContext, tool: string, input: unknown): Promise<unknown> {
	const run = AGENT_TOOLS[tool];

	if (run === undefined) {
		throw new Error(UNKNOWN_TOOL.replace("{tool}", tool));
	}

	return run(context, input);
}
