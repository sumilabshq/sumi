import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import type { AgentSetup } from "../../shared/agent-setup.js";

export interface AgentItemHandlers {
	readonly onChoose: (id: string) => void;
	readonly onHelperAgents: (on: boolean) => void;
	readonly onOpenProviders: () => void;
	readonly onClear: () => void;
}

export interface AgentItemsProps extends AgentItemHandlers {
	readonly setup: AgentSetup;
}

const AGENT = "Agent";
const CONFIGURE = "Configure providers";
const CLEAR = "Clear context";
const CHAT_ONLY = "chat only";
const HELPERS = "Use helper agents";

export function AgentItems({
	setup,
	onChoose,
	onHelperAgents,
	onOpenProviders,
	onClear,
}: AgentItemsProps): ReactElement {
	return (
		<div className="wg-studio-ai-menu" data-name="Agent">
			<span className="wg-studio-ai-menu-eyebrow">{AGENT}</span>
			{setup.providers.map((provider) => (
				<PopoverItem
					key={provider.id}
					checked={provider.id === setup.chosen}
					onClick={() => onChoose(provider.id)}
					data-agent-provider={provider.id}
				>
					<span className="wg-studio-ai-menu-said">{provider.label}</span>
					{provider.canEdit ? null : <span className="wg-studio-ai-menu-aside">{CHAT_ONLY}</span>}
				</PopoverItem>
			))}
			<PopoverSeparator />
			<PopoverItem
				className="is-switch"
				checked={setup.helperAgents}
				onClick={() => onHelperAgents(!setup.helperAgents)}
				data-agent-helpers=""
			>
				<span className="wg-studio-ai-menu-said">{HELPERS}</span>
				<span className="wg-studio-ai-menu-switch" aria-hidden="true" />
			</PopoverItem>
			<PopoverItem onClick={onOpenProviders}>{CONFIGURE}</PopoverItem>
			<PopoverItem onClick={onClear}>{CLEAR}</PopoverItem>
		</div>
	);
}
