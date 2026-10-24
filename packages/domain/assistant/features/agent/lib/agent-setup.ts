import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import type { WorkspaceFolder } from "../../../shared/host/workspace-folders.host.js";
import { readsOf } from "../../../shared/lib/provider-reads.js";
import type { AgentSetup } from "../../../shared/schema/agent-setup.schema.js";
import type { ClaudeOptionAsked, ClaudeOptions } from "../../../shared/schema/claude-options.schema.js";
import type { WorkingFolders } from "../../../shared/schema/working-folder.schema.js";

export function withOptionChosen(options: ClaudeOptions, asked: ClaudeOptionAsked): ClaudeOptions {
	return {
		...options,
		...asked,
	};
}

export function workingFoldersOf({ name, folder, folderFound, recentFolders }: WorkspaceFolder): WorkingFolders {
	const current = folderFound ? folder : null;
	return {
		workspace: name,
		current,
		recent: recentFolders.length > 0 || current === null ? [...recentFolders] : [current],
	};
}

export function agentSetupOf(setup: AssistantSetup): AgentSetup {
	return {
		isReady: setup.isReady,
		providerLabel: setup.providerLabel,
		providers: setup.providers.map((provider) => ({
			id: provider.id,
			label: provider.label,
			canEdit: provider.canEdit,
			reads: readsOf(provider),
			compacts: provider.compacts ?? false,
		})),
		chosen: setup.chosen,
		helperAgents: setup.helperAgents,
		renderMarkdown: setup.renderMarkdown,
	};
}
