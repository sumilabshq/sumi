import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { PortAssistantSessionGateway } from "../assistant-session/port.gateway.js";
import { PortAssistantSetupGateway } from "../assistant-setup/port.gateway.js";
import { ObsidianAttachmentFilesGateway } from "../attachment-files/obsidian.gateway.js";
import type { PrivateFolder } from "../attachment-files/obsidian.gateway.js";
import { SystemClockGateway } from "../clock/system.gateway.js";
import type { AssistantGateways } from "./assistant-parts.gateway.js";

export interface ObsidianAssistantHold {
	readonly port: AssistantPort;
	readonly privateFolder: PrivateFolder;
	readonly folder: string;
}

export function obsidianAssistantGateways({ port, privateFolder, folder }: ObsidianAssistantHold): AssistantGateways {
	return {
		assistantSessionGateway: new PortAssistantSessionGateway(port),
		assistantSetupGateway: new PortAssistantSetupGateway(port),
		attachmentFilesGateway: new ObsidianAttachmentFilesGateway(privateFolder, folder),
		clockGateway: new SystemClockGateway(),
	};
}
