export const AGENT_CHAT_APP = "agent-chat";

const SEPARATOR = "/";

export interface AgentChatAddress {
	readonly chat: string;
	readonly agent: string;
}

export function addressOfAgentChat({ chat, agent }: AgentChatAddress): string {
	return `${chat}${SEPARATOR}${agent}`;
}

export function agentChatAt(address: string | null): AgentChatAddress | null {
	const [chat, agent, ...rest] = (address ?? "").split(SEPARATOR);
	return chat === undefined || chat === "" || agent === undefined || agent === "" || rest.length > 0
		? null
		: { chat, agent };
}
