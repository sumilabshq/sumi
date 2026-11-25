const CHAT_FLOW_PREFIX = "flow-chat-";
const GROUP_FLOW_PREFIX = "flow-loose-";
const TAB_FLOW_PREFIX = "flow-tab-";
const FOLDER_PREFIX = "folder-";
const PANE_PREFIX = "pane-of-";
const NEW_FLOW_PREFIX = "flow-new-";
const STARTED_FLOW_PREFIX = "flow-setup-";
const NEW_FOLDER_PREFIX = "folder-new-";
const NEW_PROJECT_PREFIX = "project-new-";
const NEW_SETUP_PREFIX = "setup-";

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

export function newFlowIdOf(key: string): string {
	return `${NEW_FLOW_PREFIX}${key}`;
}

export function startedFlowIdOf(key: string): string {
	return `${STARTED_FLOW_PREFIX}${key}`;
}

export function newFolderIdOf(key: string): string {
	return `${NEW_FOLDER_PREFIX}${key}`;
}

export function newProjectIdOf(key: string): string {
	return `${NEW_PROJECT_PREFIX}${key}`;
}

export function newSetupIdOf(key: string): string {
	return `${NEW_SETUP_PREFIX}${key}`;
}

export function callKeyOf(idempotencyKey: string | null): string {
	return idempotencyKey ?? crypto.randomUUID();
}
