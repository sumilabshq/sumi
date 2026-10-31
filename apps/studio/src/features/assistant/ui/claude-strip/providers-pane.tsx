import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { ChatMenuLabel } from "../chat-menu/chat-menu-label.js";
import { ChatMenuLine } from "../chat-menu/chat-menu-line.js";
import { ChatMenuRow } from "../chat-menu/chat-menu-row.js";
import type { AgentSetup } from "@widgetarium/assistant";

export interface ProvidersPaneProps {
	readonly setup: AgentSetup;
	readonly shownProviderId: string;
	readonly onBrowse: (id: string) => void;
	readonly onManage: () => void;
}

const PROVIDER = "Provider";
const MANAGE = "Manage";

export function ProvidersPane({ setup, shownProviderId, onBrowse, onManage }: ProvidersPaneProps): ReactElement {
	return (
		<div className="wg-studio-ai-menu-pane is-providers">
			<ChatMenuLabel>{PROVIDER}</ChatMenuLabel>
			{setup.providers.map(({ id, label }) => {
				const isShown = id === shownProviderId;
				return (
					<ChatMenuRow
						key={id}
						text={label}
						isActive={isShown}
						end={isShown ? <Icon name="chevron-right" size={14} /> : undefined}
						onPick={() => onBrowse(id)}
					/>
				);
			})}
			<span className="wg-studio-ai-menu-spacer" />
			<ChatMenuLine />
			<ChatMenuRow text={MANAGE} mark={<Icon name="sliders-horizontal" size={16} />} onPick={onManage} />
		</div>
	);
}
