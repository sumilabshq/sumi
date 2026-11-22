import { createElement as h } from "react";
import type { ReactElement } from "react";
import { saidElapsed } from "@sumi/chat-plugin";
import { Icon, Pressable, Spinner } from "@widgetarium/kit";
import { spanMsOf } from "../../lib/background-words.js";
import type { ShownAgent } from "../../lib/background-words.js";

export interface AgentRowProps {
	readonly agent: ShownAgent;
	readonly now: number;
	readonly onOpen: ((agent: string) => void) | null;
}

const STATE_SIZE = 14;

const OPEN_SAID = "Open this agent's chat, read only";

export function AgentRow({ agent, now, onOpen }: AgentRowProps): ReactElement {
	return (
		<Pressable
			variant="quiet"
			tone="muted"
			className="sumi-background-agent"
			label={OPEN_SAID}
			disabled={onOpen === null}
			onClick={() => onOpen?.(agent.id)}
		>
			<span className="sumi-background-agent-title">{agent.title}</span>
			<span className="sumi-background-agent-said">{agent.said}</span>
			<span className="sumi-background-agent-took">{saidElapsed(spanMsOf(agent, now))}</span>
			<AgentState agent={agent} />
		</Pressable>
	);
}

function AgentState({ agent }: { readonly agent: ShownAgent }): ReactElement {
	if (agent.state === "working") {
		return <Spinner size={STATE_SIZE} />;
	}

	if (agent.state === "done") {
		return <Icon name="check" size={STATE_SIZE} className="sumi-background-agent-done" />;
	}

	return <Icon name="x" size={STATE_SIZE} className="sumi-background-agent-stopped" />;
}
