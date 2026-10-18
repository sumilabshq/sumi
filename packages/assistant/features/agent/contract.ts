import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import {
	AgentSetupSchema,
	HelperAgentsAskedSchema,
	ProviderAskedSchema,
} from "../../shared/schema/agent-setup.schema.js";

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

export const ClearChatCommand = command("assistant/clear-chat").idempotencyKey(Repeatable);
