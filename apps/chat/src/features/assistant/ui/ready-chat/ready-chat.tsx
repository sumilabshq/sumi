import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { ClaudeStrip } from "../claude-strip/claude-strip.js";
import { useTellsAgentActivity } from "../../lib/agent-activity.js";
import { useStuckToEnd } from "../../lib/use-stuck-to-end.js";
import { ToEndButton } from "../to-end-button/to-end-button.js";
import { useChatAsks } from "../../lib/use-chat-asks.js";
import { useDropsFiles } from "../../lib/use-drops-files.js";
import { useSweepsAttachments } from "../../lib/use-sweeps-attachments.js";
import { Composer } from "../composer/composer.js";
import { FileDropZone } from "../file-drop-zone/file-drop-zone.js";
import type { AttachedChange, ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { useFailureLine } from "../../lib/failure-line.js";
import { scrollToCard } from "../../lib/scroll-to-card.js";
import { BareLead } from "../chat-lead/bare-lead.js";
import { ChatLeadHead } from "../chat-lead/chat-lead.js";
import { FailureSaid } from "../failure-said/failure-said.js";
import { ChatTurns } from "./chat-turns.js";
import { ChatQuery, StopTurnCommand } from "@widgetarium/assistant";

export interface ReadyChatProps {
	readonly setupFailure: string | null;
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
	readonly cards: ChatCardsSlot;
}

const TITLE = "Widgetarium AI";

export function ReadyChat({ setupFailure, lead, title, cards }: ReadyChatProps): ReactElement {
	const { data: chat } = useQuery(ChatQuery);
	const { session } = chat;
	const { scroller, isStuck, onScroll, toEnd } = useStuckToEnd([session.turns, session.busy]);
	const [change, setChange] = useState<AttachedChange | null>(null);
	const { failure, report } = useFailureLine();
	const asks = useChatAsks({ report, change, setChange });
	const stopTurn = useCommand(StopTurnCommand);
	const chatRoot = useRef<HTMLDivElement>(null);
	const showCard = (key: string): void => scrollToCard(chatRoot.current, key);
	const typed = useTellsAgentActivity(chat);
	const drop = useDropsFiles();
	useSweepsAttachments(session.busy);
	const { Pinned, Strip } = cards;
	const isEmpty = session.turns.length === 0;
	return (
		<div
			className={`wg-studio-ai${isEmpty ? " is-empty" : ""}`}
			ref={chatRoot}
			onDragEnter={drop.onDragEnter}
			onDragOver={drop.onDragOver}
			onDragLeave={drop.onDragLeave}
			onDrop={drop.onDrop}
		>
			{isEmpty ? <BareLead lead={lead} /> : <ChatLeadHead lead={lead} title={title ?? TITLE} />}
			<div className="wg-studio-ai-scroll-frame">
				<div className="wg-studio-ai-scroll" ref={scroller} onScroll={onScroll}>
					<ChatTurns chat={chat} cards={cards} asks={asks} />
				</div>
				{isStuck ? null : <ToEndButton toEnd={toEnd} />}
			</div>
			<Pinned session={session} showCard={showCard} />
			<Strip showCard={showCard} />
			<FailureSaid failure={failure ?? setupFailure} />
			<Composer
				busy={session.busy}
				strip={<ClaudeStrip isEmpty={isEmpty} />}
				isFirst={isEmpty}
				attached={change ? { label: change.label, onClear: () => setChange(null) } : null}
				onSend={asks.send}
				onStop={() => void stopTurn.run()}
				onTyped={typed}
			/>
			<FileDropZone isOver={drop.isOver} />
		</div>
	);
}
