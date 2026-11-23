const CHAT_FLOW_PREFIX = "flow-chat-";
const GROUP_FLOW_PREFIX = "flow-loose-";
const TAB_FLOW_PREFIX = "flow-tab-";
const FOLDER_PREFIX = "folder-";
const PANE_PREFIX = "pane-of-";

export function chatFlowIdOf(chatId: string): string {
	return `${CHAT_FLOW_PREFIX}${chatId}`;
}

export function groupFlowIdOf(groupId: string): string {
	return `${GROUP_FLOW_PREFIX}${groupId}`;
}

export function tabFlowIdOf(tabId: string): string {
	return `${TAB_FLOW_PREFIX}${tabId}`;
}

export function folderIdOf(groupId: string): string {
	return `${FOLDER_PREFIX}${groupId}`;
}

export function firstPaneIdOf(flowId: string): string {
	return `${PANE_PREFIX}${flowId}`;
}
