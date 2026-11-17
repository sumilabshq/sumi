import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { launcherFrom, quickLauncherFrom } from "../../shared/lib/turn-launcher.js";
import type { ChatPartsGateway } from "../chat-parts/chat-parts.gateway.js";
import { LentChatPartsGateway } from "../chat-parts/lent.gateway.js";
import { AddedRunnersGateway } from "../runners/added.gateway.js";
import type { RunnersGateway } from "../runners/runners.gateway.js";
import { ServedToolLabelsGateway } from "../tool-labels/served.gateway.js";
import type { ToolLabelsGateway } from "../tool-labels/tool-labels.gateway.js";
import type { AgentHosts } from "./assistant-parts.gateway.js";

export type AssistantModuleParts = {
	readonly chatParts: ChatPartsGateway;
	readonly runners: RunnersGateway;
	readonly toolLabels: ToolLabelsGateway;
};

export function chatPartsOn({ config }: { readonly config: AgentHosts }): AssistantModuleParts {
	const runners = config.runners ?? [];
	portOf(config).useLauncher?.(launcherFrom(runners, config.promptParts ?? []));
	portOf(config).useQuickLauncher?.(quickLauncherFrom(runners));
	return {
		chatParts: new LentChatPartsGateway(config),
		runners: new AddedRunnersGateway(runners),
		toolLabels: new ServedToolLabelsGateway(config.mcpServers ?? []),
	};
}

function portOf(config: AgentHosts): AssistantPort {
	if (config.kind === "tauri") {
		return config.tauriAssistant;
	}

	if (config.kind === "obsidian") {
		return config.obsidianAssistant;
	}

	return config.webAssistant;
}
