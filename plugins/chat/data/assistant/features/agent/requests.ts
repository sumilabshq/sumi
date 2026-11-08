import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { chooseOptions, holdProvider } from "../../shared/lib/chat-drafts.js";
import { OPTIONS_NOT_HERE } from "../../gateways/claude-options/none.gateway.js";
import { WORKING_FOLDER_NOT_HERE } from "../../gateways/working-folders/none.gateway.js";
import {
	setupChanged,
	claudeOptionsChanged,
	workingFolderChanged,
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

const NO_CLAUDE_CODE = "Claude Code is not among the providers, so its model cannot be chosen.";

export const setup = query()
	.public()
	.input(ChatKeySchema)
	.output(AgentSetupSchema)
	.handle(inChat(async (_input, { assistantSetup }) => agentSetupOf(await assistantSetup.setup())));

export const chooseProvider = command()
	.public()
	.input(ProviderAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ id }, { assistantSetup, chatDrafts, invalidate }) => {
			invalidate(setup);
			await assistantSetup.chooseProvider(id);
			holdProvider(chatDrafts, id);
		}),
	);

export const setHelpers = command()
	.public()
	.input(HelperAgentsAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ on }, { assistantSetup, invalidate }) => {
			invalidate(setup);
			await assistantSetup.setHelperAgents(on);
		}),
	);

export const openProviders = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(Repeatable)
	.handle(inChat((_input, { assistantSetup }) => assistantSetup.openProviders()));

export const claudeOptions = query()
	.public()
	.input(ChatKeySchema)
	.output(ClaudeOptionsSchema.nullable())
	.settlesNow()
	.handle(inChat((_input, { claudeOptions }) => claudeOptions.claudeOptions()));

export const chooseClaudeOption = command()
	.public()
	.input(ClaudeOptionInChatSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(({ option: asked }, { claudeOptions: claudeOptionsGateway, chatDrafts, invalidate }) => {
			const was = claudeOptionsGateway.claudeOptions();

			if (was === null) {
				return refuse(OPTIONS_NOT_HERE);
			}

			invalidate(claudeOptions);
			const next = withOptionChosen(was, asked);
			chooseOptions({ claudeOptions: claudeOptionsGateway, chatDrafts }, next);
			console.debug(
				`[widgetarium] claude options ${JSON.stringify(was)} → ${JSON.stringify(next)} (chose ${JSON.stringify(asked)})`,
			);
		}),
	);

export const chooseClaudeModel = command()
	.public()
	.input(ClaudeModelAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ model }, { assistantSetup, claudeOptions: claudeOptionsGateway, chatDrafts, invalidate }) => {
			const providerSetup = await assistantSetup.setup();

			if (!providerSetup.providers.some(({ id }) => id === CLAUDE_CODE_PROVIDER_ID)) {
				return refuse(NO_CLAUDE_CODE);
			}

			if (providerSetup.chosen !== CLAUDE_CODE_PROVIDER_ID) {
				invalidate(setup);
				await assistantSetup.chooseProvider(CLAUDE_CODE_PROVIDER_ID);
				holdProvider(chatDrafts, CLAUDE_CODE_PROVIDER_ID);
				console.info(
					`[widgetarium] provider ${providerSetup.chosen} → ${CLAUDE_CODE_PROVIDER_ID} (chose the Claude model ${model})`,
				);
			}

			const was = claudeOptionsGateway.claudeOptions();

			if (was === null) {
				return refuse(OPTIONS_NOT_HERE);
			}

			invalidate(claudeOptions);
			chooseOptions({ claudeOptions: claudeOptionsGateway, chatDrafts }, withOptionChosen(was, { model }));
			console.debug(`[widgetarium] claude model ${was.model} → ${model}`);
		}),
	);

export const workingFolders = query()
	.public()
	.input(ChatKeySchema)
	.output(WorkingFoldersSchema.nullable())
	.handle(
		inChat((_input, { workingFolders }) => {
			const held = workingFolders.workspaceFolder();
			return held === null ? null : workingFoldersOf(held);
		}),
	);

export const chooseWorkingFolder = command()
	.public()
	.input(FolderAskedSchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async ({ path }, { workingFolders: workingFoldersGateway, invalidate }) => {
			const was = workingFoldersGateway.workspaceFolder();

			if (was === null) {
				return refuse(WORKING_FOLDER_NOT_HERE);
			}

			invalidate(workingFolders);
			const next = await workingFoldersGateway.chosenFolder(was.id, path);
			workingFoldersGateway.saveWorkspaceFolder(next);
			console.info(`[widgetarium] working folder ${String(was.folder)} → ${String(next.folder)} (chose ${path})`);
		}),
	);

export const pickWorkingFolder = command()
	.public()
	.input(ChatKeySchema)
	.idempotencyKey(PerCall)
	.handle(
		inChat(async (_input, { workingFolders: workingFoldersGateway, invalidate }) => {
			const was = workingFoldersGateway.workspaceFolder();

			if (was === null) {
				return refuse(WORKING_FOLDER_NOT_HERE);
			}

			const picked = await workingFoldersGateway.attachedPickedFolder(was.id);

			if (picked === null) {
				console.info(`[widgetarium] working folder kept ${String(was.folder)}: no folder was picked`);
				return;
			}

			invalidate(workingFolders);
			workingFoldersGateway.saveWorkspaceFolder(picked);
			console.info(
				`[widgetarium] working folder ${String(was.folder)} → ${String(picked.folder)} (picked another folder)`,
			);
		}),
	);

export const rereadSetup = subscriber(setupChanged).handle((_input, { invalidate }) => {
	invalidate(setup);
});

export const rereadWorkingFolders = subscriber(workingFolderChanged).handle((_input, { invalidate }) => {
	invalidate(workingFolders);
});

export const rereadClaudeOptions = subscriber(claudeOptionsChanged).handle((_input, { invalidate }) => {
	invalidate(claudeOptions);
});
