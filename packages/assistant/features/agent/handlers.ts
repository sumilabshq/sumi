import type { AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { handler } from "@widgetarium/core/requests";
import { AssistantSetupGateway } from "../../gateways/assistant-setup/assistant-setup.gateway.js";
import { ClaudeOptionsGateway } from "../../gateways/claude-options/claude-options.gateway.js";
import { WorkingFolderGateway } from "../../gateways/working-folder/working-folder.gateway.js";
import type { AgentSetup, ProviderReads } from "../../shared/schema/agent-setup.schema.js";
import { AssistantClientModule } from "../../module.js";
import {
	AgentSetupQuery,
	ChooseClaudeOptionCommand,
	ChooseProviderCommand,
	ChooseWorkingFolderCommand,
	ClaudeOptionsQuery,
	PickWorkingFolderCommand,
	WorkingFoldersQuery,
	OpenProvidersCommand,
	SetHelperAgentsCommand,
} from "./contract.js";

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

export const ClaudeOptionsQueryHandler = handler(ClaudeOptionsQuery, AssistantClientModule)
	.inject({ claudeOptionsGateway: ClaudeOptionsGateway })
	.watch((_input, { claudeOptionsGateway }, changed) => claudeOptionsGateway.watch(changed))
	.handle((_input, { claudeOptionsGateway }) => claudeOptionsGateway.options());

export const ChooseClaudeOptionCommandHandler = handler(ChooseClaudeOptionCommand, AssistantClientModule)
	.inject({ claudeOptionsGateway: ClaudeOptionsGateway })
	.handle((asked, { claudeOptionsGateway }) => claudeOptionsGateway.choose(asked));

export const WorkingFoldersQueryHandler = handler(WorkingFoldersQuery, AssistantClientModule)
	.inject({ workingFolderGateway: WorkingFolderGateway })
	.watch((_input, { workingFolderGateway }, changed) => workingFolderGateway.watch(changed))
	.handle((_input, { workingFolderGateway }) => workingFolderGateway.folders());

export const ChooseWorkingFolderCommandHandler = handler(ChooseWorkingFolderCommand, AssistantClientModule)
	.inject({ workingFolderGateway: WorkingFolderGateway })
	.handle(({ path }, { workingFolderGateway }) => workingFolderGateway.choose(path));

export const PickWorkingFolderCommandHandler = handler(PickWorkingFolderCommand, AssistantClientModule)
	.inject({ workingFolderGateway: WorkingFolderGateway })
	.handle((_input, { workingFolderGateway }) => workingFolderGateway.pickAnother());

function agentSetupOf(setup: AssistantSetup): AgentSetup {
	return {
		isReady: setup.isReady,
		providerLabel: setup.providerLabel,
		providers: setup.providers.map((provider) => ({
			id: provider.id,
			label: provider.label,
			canEdit: provider.canEdit,
			reads: provider.reads ?? READS_NOTHING,
			compacts: provider.compacts ?? false,
		})),
		chosen: setup.chosen,
		helperAgents: setup.helperAgents,
		renderMarkdown: setup.renderMarkdown,
	};
}
