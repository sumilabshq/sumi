import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import {
	AgentSetupSchema,
	HelperAgentsAskedSchema,
	ProviderAskedSchema,
} from "../../shared/schema/agent-setup.schema.js";
import { ClaudeOptionAskedSchema, ClaudeOptionsSchema } from "../../shared/schema/claude-options.schema.js";
import { FolderAskedSchema, WorkingFoldersSchema } from "../../shared/schema/working-folder.schema.js";

export const AgentSetupQuery = query("assistant/agent-setup").output(AgentSetupSchema);

export const ChooseProviderCommand = command("assistant/choose-provider")
	.input(ProviderAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([AgentSetupQuery]);

export const SetHelperAgentsCommand = command("assistant/set-helper-agents")
	.input(HelperAgentsAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([AgentSetupQuery]);

export const OpenProvidersCommand = command("assistant/open-providers").idempotencyKey(Repeatable).invalidates([]);

export const ClaudeOptionsQuery = query("assistant/claude-options").output(ClaudeOptionsSchema.nullable()).settlesNow();

export const ChooseClaudeOptionCommand = command("assistant/choose-claude-option")
	.input(ClaudeOptionAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([ClaudeOptionsQuery]);

export const WorkingFoldersQuery = query("assistant/working-folders").output(WorkingFoldersSchema.nullable());

export const ChooseWorkingFolderCommand = command("assistant/choose-working-folder")
	.input(FolderAskedSchema)
	.idempotencyKey(PerCall)
	.invalidates([WorkingFoldersQuery]);

export const PickWorkingFolderCommand = command("assistant/pick-working-folder")
	.idempotencyKey(PerCall)
	.invalidates([WorkingFoldersQuery]);
