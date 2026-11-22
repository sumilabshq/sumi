import { createElement as h } from "react";
import type { ReactElement } from "react";
import { assistant } from "@widgetarium/assistant/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Icon,
	Pressable,
	TreeList,
	TreeListItem,
} from "@widgetarium/kit";
import { saidElapsed } from "@sumi/chat-plugin";
import { backgroundSaidOf, earliestStartOf } from "../../lib/background-words.js";
import type { ShownAgent } from "../../lib/background-words.js";
import { useTickingNow } from "../../lib/use-ticking-now.js";
import { useOpensAgentChat } from "../../lib/use-opens-agent-chat.js";
import { AgentRow } from "../agent-row/agent-row.js";

export interface BackgroundAgentsProps {
	readonly chatId: string;
}

const CHEVRON_SIZE = 14;

export function BackgroundAgents({ chatId }: BackgroundAgentsProps): ReactElement | null {
	const agents = useOptionalQuery(assistant.chat.one, { chat: chatId }).data?.session.background ?? [];
	const openAgentChat = useOpensAgentChat(chatId);
	return agents.length === 0 ? null : <BackgroundAgentsView agents={agents} onOpen={openAgentChat} />;
}

export interface BackgroundAgentsViewProps {
	readonly agents: readonly ShownAgent[];
	readonly isOpenAtFirst?: boolean;
	readonly onOpen?: (agent: string) => void;
}

export function BackgroundAgentsView({
	agents,
	isOpenAtFirst = false,
	onOpen,
}: BackgroundAgentsViewProps): ReactElement {
	const { said, isWorking, notDone } = backgroundSaidOf(agents);
	const now = useTickingNow(isWorking);
	return (
		<Collapsible className="sumi-background-agents" defaultOpen={isOpenAtFirst}>
			<CollapsibleTrigger asChild={true}>
				<Pressable variant="quiet" tone="muted" className="sumi-background-agents-head">
					<span className={isWorking ? "sumi-background-agents-said wg-kit-shimmer" : "sumi-background-agents-said"}>
						{said}
					</span>
					{isWorking ? (
						<span className="sumi-background-agents-took">{saidElapsed(now - earliestStartOf(agents))}</span>
					) : null}
					{notDone === null ? null : <span className="sumi-background-agents-not-done">{notDone}</span>}
					<Icon name="chevron-right" size={CHEVRON_SIZE} className="sumi-background-agents-chevron" />
				</Pressable>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<TreeList>
					{agents.map((agent) => (
						<TreeListItem key={agent.id}>
							<AgentRow agent={agent} now={now} onOpen={onOpen ?? null} />
						</TreeListItem>
					))}
				</TreeList>
			</CollapsibleContent>
		</Collapsible>
	);
}
