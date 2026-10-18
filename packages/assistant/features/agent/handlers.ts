import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { handler } from "@widgetarium/core/requests";
import { AssistantSessionGateway } from "../../gateways/assistant-session/assistant-session.gateway.js";
import { AssistantSetupGateway } from "../../gateways/assistant-setup/assistant-setup.gateway.js";
import { AttachmentFilesGateway } from "../../gateways/attachment-files/attachment-files.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { sweepFolder } from "../../shared/lib/attachment-sweep.js";
import { DraftAttachmentsStore } from "../../shared/lib/draft-attachments-store.js";
import { SentAttachmentsStore } from "../../shared/lib/sent-attachments-store.js";
import type { AgentSetup, ProviderReads } from "../../shared/schema/agent-setup.schema.js";
import { AssistantClientModule } from "../../module.js";
import {
	AgentSetupQuery,
	ChooseProviderCommand,
	ClearChatCommand,
	OpenProvidersCommand,
	SetHelperAgentsCommand,
} from "./contract.js";

const CLEARED = "the chat was cleared";

const READS_NOTHING: ProviderReads = {
	images: false,
	files: "none",
};

export const AgentSetupQueryHandler = handler(AgentSetupQuery, AssistantClientModule)
	.inject({ assistantSetupGateway: AssistantSetupGateway })
	.watch((_input, { assistantSetupGateway }, changed) => assistantSetupGateway.watch(changed))
	.handle(async (_input, { assistantSetupGateway }) => agentSetupOf(await assistantSetupGateway.setup()));

export const ChooseProviderCommandHandler = handler(ChooseProviderCommand, AssistantClientModule)
	.inject({ assistantSetupGateway: AssistantSetupGateway })
	.handle(({ id }, { assistantSetupGateway }) => assistantSetupGateway.chooseProvider(id));

export const SetHelperAgentsCommandHandler = handler(SetHelperAgentsCommand, AssistantClientModule)
	.inject({ assistantSetupGateway: AssistantSetupGateway })
	.handle(({ on }, { assistantSetupGateway }) => assistantSetupGateway.setHelperAgents(on));

export const OpenProvidersCommandHandler = handler(OpenProvidersCommand, AssistantClientModule)
	.inject({ assistantSetupGateway: AssistantSetupGateway })
	.handle((_input, { assistantSetupGateway }) => assistantSetupGateway.openProviders());

export const ClearChatCommandHandler = handler(ClearChatCommand, AssistantClientModule)
	.inject({
		assistantSessionGateway: AssistantSessionGateway,
		attachmentFilesGateway: AttachmentFilesGateway,
		draftAttachmentsStore: DraftAttachmentsStore,
		sentAttachmentsStore: SentAttachmentsStore,
		clockGateway: ClockGateway,
	})
	.handle(async (_input, parts) => {
		await parts.assistantSessionGateway.clear();
		parts.draftAttachmentsStore.change([], CLEARED);
		sweepFolder(parts, {
			isBusy: false,
			now: parts.clockGateway.now(),
		});
	});

function agentSetupOf(setup: AssistantSetup): AgentSetup {
	return {
		isReady: setup.isReady,
		providerLabel: setup.providerLabel,
		providers: setup.providers.map((provider) => ({
			id: provider.id,
			label: provider.label,
			canEdit: provider.canEdit,
			reads: provider.reads ?? READS_NOTHING,
		})),
		chosen: setup.chosen,
		helperAgents: setup.helperAgents,
		renderMarkdown: setup.renderMarkdown,
	};
}
