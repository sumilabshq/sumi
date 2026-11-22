import { createElement as h } from "react";
import type { ReactElement } from "react";
import { navigation } from "@sumi/contract";
import type { TabPageProps } from "@sumi/sumi-host-plugin";
import { ReadOnlyChat } from "@sumi/chat-plugin";
import { assistant } from "@widgetarium/assistant/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { agentChatAt } from "../../../../shared/lib/agent-chat-address.js";
import type { AgentChatAddress } from "../../../../shared/lib/agent-chat-address.js";

const NOT_AN_AGENT = "This tab names no background agent.";
const READ_ONLY = "read only";

export function AgentChatPage({ tabId }: TabPageProps): ReactElement {
	const tab = useOptionalQuery(navigation.tabFacts.ownAppTab, { id: tabId });
	const at = agentChatAt(tab.data?.address ?? null);

	if (at === null) {
		return <p className="sumi-agent-chat-note">{tab.failure ?? NOT_AN_AGENT}</p>;
	}

	return <AgentChat at={at} />;
}

function AgentChat({ at }: { readonly at: AgentChatAddress }): ReactElement {
	const agentChat = useOptionalQuery(assistant.chat.agentChat, at);
	const parent = useOptionalQuery(assistant.chat.one, { chat: at.chat });
	const title = parent.data?.session.background.find(({ id }) => id === at.agent)?.title ?? at.agent;
	return (
		<div className="wg-chat-app sumi-agent-chat">
			<div className="sumi-agent-chat-head">
				<span className="sumi-agent-chat-title">{title}</span>
				<span className="sumi-agent-chat-mode">{READ_ONLY}</span>
			</div>
			{agentChat.data === null ? (
				<p className="sumi-agent-chat-note">{agentChat.failure}</p>
			) : (
				<ReadOnlyChat chat={agentChat.data} />
			)}
		</div>
	);
}
