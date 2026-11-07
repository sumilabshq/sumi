import { PerCall, Repeatable, command, query, refuse, subscriber } from "@widgetarium/data-framework";
import { chooseOptions, holdProvider } from "../../shared/lib/chat-drafts.js";
import { OPTIONS_NOT_HERE } from "../../gateways/claude-options/none.gateway.js";
import { WORKING_FOLDER_NOT_HERE } from "../../gateways/working-folders/none.gateway.js";
import {
	AssistantSetupChangedEvent,
	ClaudeOptionsChangedEvent,
	WorkingFolderChangedEvent,
} from "../../gateways/chat-parts/chat-parts.events.js";
import {
	AgentSetupSchema,
	HelperAgentsAskedSchema,
	ProviderAskedSchema,
} from "../../shared/schema/agent-setup.schema.js";
import {
	ClaudeModelAskedSchema,
	ClaudeOptionInChatSchema,
	ClaudeOptionsSchema,
} from "../../shared/schema/claude-options.schema.js";
import { FolderAskedSchema, WorkingFoldersSchema } from "../../shared/schema/working-folder.schema.js";
import { CLAUDE_CODE_PROVIDER_ID, agentSetupOf, withOptionChosen, workingFoldersOf } from "./lib/agent-setup.js";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { inChat } from "../../gateways/chat-parts/in-chat.js";
import { ChatPartsGateway } from "../../gateways/chat-parts/chat-parts.gateway.js";

const NO_CLAUDE_CODE = "Claude Code is not among the providers, so its model cannot be chosen.";

export const AgentSetupQuery = query("agent-setup")
	.input(ChatKeySchema)
	.output(AgentSetupSchema)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async (_input, { assistantSetup }) => agentSetupOf(await assistantSetup.setup())));

export const ChooseProviderCommand = command("choose-provider")
	.input(ProviderAskedSchema)
	.idempotencyKey(PerCall)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async ({ id }, { assistantSetup, chatDrafts, invalidate }) => {
		invalidate(AgentSetupQuery);
		await assistantSetup.chooseProvider(id);
		holdProvider(chatDrafts, id);
	}));

export const SetHelperAgentsCommand = command("set-helper-agents")
	.input(HelperAgentsAskedSchema)
	.idempotencyKey(PerCall)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async ({ on }, { assistantSetup, invalidate }) => {
		invalidate(AgentSetupQuery);
		await assistantSetup.setHelperAgents(on);
	}));

export const OpenProvidersCommand = command("open-providers")
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat((_input, { assistantSetup }) => assistantSetup.openProviders()));

export const ClaudeOptionsQuery = query("claude-options")
	.input(ChatKeySchema)
	.output(ClaudeOptionsSchema.nullable())
	.settlesNow()
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat((_input, { claudeOptions }) => claudeOptions.claudeOptions()));

export const ChooseClaudeOptionCommand = command("choose-claude-option")
	.input(ClaudeOptionInChatSchema)
	.idempotencyKey(PerCall)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(({ option: asked }, { claudeOptions, chatDrafts, invalidate }) => {
		const was = claudeOptions.claudeOptions();

		if (was === null) {
			return refuse(OPTIONS_NOT_HERE);
		}

		invalidate(ClaudeOptionsQuery);
		const next = withOptionChosen(was, asked);
		chooseOptions({ claudeOptions, chatDrafts }, next);
		console.debug(
			`[widgetarium] claude options ${JSON.stringify(was)} → ${JSON.stringify(next)} (chose ${JSON.stringify(asked)})`,
		);
	}));

export const ChooseClaudeModelCommand = command("choose-claude-model")
	.input(ClaudeModelAskedSchema)
	.idempotencyKey(PerCall)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async ({ model }, { assistantSetup, claudeOptions, chatDrafts, invalidate }) => {
		const setup = await assistantSetup.setup();

		if (!setup.providers.some(({ id }) => id === CLAUDE_CODE_PROVIDER_ID)) {
			return refuse(NO_CLAUDE_CODE);
		}

		if (setup.chosen !== CLAUDE_CODE_PROVIDER_ID) {
			invalidate(AgentSetupQuery);
			await assistantSetup.chooseProvider(CLAUDE_CODE_PROVIDER_ID);
			holdProvider(chatDrafts, CLAUDE_CODE_PROVIDER_ID);
			console.info(
				`[widgetarium] provider ${setup.chosen} → ${CLAUDE_CODE_PROVIDER_ID} (chose the Claude model ${model})`,
			);
		}

		const was = claudeOptions.claudeOptions();

		if (was === null) {
			return refuse(OPTIONS_NOT_HERE);
		}

		invalidate(ClaudeOptionsQuery);
		chooseOptions({ claudeOptions, chatDrafts }, withOptionChosen(was, { model }));
		console.debug(`[widgetarium] claude model ${was.model} → ${model}`);
	}));

export const WorkingFoldersQuery = query("working-folders")
	.input(ChatKeySchema)
	.output(WorkingFoldersSchema.nullable())
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat((_input, { workingFolders }) => {
		const held = workingFolders.workspaceFolder();
		return held === null ? null : workingFoldersOf(held);
	}));

export const ChooseWorkingFolderCommand = command("choose-working-folder")
	.input(FolderAskedSchema)
	.idempotencyKey(PerCall)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async ({ path }, { workingFolders, invalidate }) => {
		const was = workingFolders.workspaceFolder();

		if (was === null) {
			return refuse(WORKING_FOLDER_NOT_HERE);
		}

		invalidate(WorkingFoldersQuery);
		const next = await workingFolders.chosenFolder(was.id, path);
		workingFolders.saveWorkspaceFolder(next);
		console.info(`[widgetarium] working folder ${String(was.folder)} → ${String(next.folder)} (chose ${path})`);
	}));

export const PickWorkingFolderCommand = command("pick-working-folder")
	.input(ChatKeySchema)
	.idempotencyKey(PerCall)
	.inject({ chatParts: ChatPartsGateway })
	.handle(inChat(async (_input, { workingFolders, invalidate }) => {
		const was = workingFolders.workspaceFolder();

		if (was === null) {
			return refuse(WORKING_FOLDER_NOT_HERE);
		}

		const picked = await workingFolders.attachedPickedFolder(was.id);

		if (picked === null) {
			console.info(`[widgetarium] working folder kept ${String(was.folder)}: no folder was picked`);
			return;
		}

		invalidate(WorkingFoldersQuery);
		workingFolders.saveWorkspaceFolder(picked);
		console.info(
			`[widgetarium] working folder ${String(was.folder)} → ${String(picked.folder)} (picked another folder)`,
		);
	}));

export const RereadAgentSetupSubscriber = subscriber(AssistantSetupChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AgentSetupQuery);
});

export const RereadWorkingFoldersSubscriber = subscriber(WorkingFolderChangedEvent).handle((_input, { invalidate }) => {
	invalidate(WorkingFoldersQuery);
});

export const RereadClaudeOptionsSubscriber = subscriber(ClaudeOptionsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ClaudeOptionsQuery);
});
