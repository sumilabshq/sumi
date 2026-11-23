import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { ComposerFooter } from "../composer-footer/composer-footer.js";
import { ComposerFieldOptions } from "../composer-field-options/composer-field-options.js";
import { ComposerMeter } from "../composer-meter/composer-meter.js";
import { useTellsAgentActivity } from "../../lib/agent-activity.js";
import { ChatScroll } from "./chat-scroll.js";
import { useChatAsks } from "../../lib/use-chat-asks.js";
import { useDropsFiles } from "../../lib/use-drops-files.js";
import { useSweepsAttachments } from "../../lib/use-sweeps-attachments.js";
import { Composer } from "../composer/composer.js";
import { FileDropZone } from "../file-drop-zone/file-drop-zone.js";
import type { AttachedChange, ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { useFailureLine } from "../../../../shared/lib/failure-line.js";
import { scrollToCard } from "../../lib/scroll-to-card.js";
import { BareLead } from "../chat-lead/bare-lead.js";
import { ChatLeadHead } from "../chat-lead/chat-lead.js";
import { ChatPart } from "../chat-part/chat-part.js";
import { FailureSaid } from "../failure-said/failure-said.js";
import { PluginSlot } from "@widgetarium/plugin-framework/react";
import { ChatTurns } from "./chat-turns.js";
import { QueueZone } from "../queue/queue-zone.js";
import { useQueueActions } from "../../lib/use-queue-actions.js";
import { ChatDock } from "./chat-dock.js";
import { ChatHead } from "../../../chat-page/ui/chat-page/chat-head.js";
import { assistant } from "@widgetarium/assistant/contract";

export interface ReadyChatProps {
	readonly setupFailure: string | null;
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
	readonly cards: ChatCardsSlot;
	readonly chatId?: string | undefined;
}

const TITLE = "Widgetarium AI";

export function ReadyChat({ setupFailure, lead, title, cards, chatId }: ReadyChatProps): ReactElement {
	const { data: chat } = useQuery(assistant.chat.one, { chat: chatId ?? null });
	const { session } = chat;
	const [change, setChange] = useState<AttachedChange | null>(null);
	const { failure, report } = useFailureLine();
	const asks = useChatAsks({ report, change, setChange });
	const queueActions = useQueueActions(report);
	const editing = chat.queued.find(({ isHeld }) => isHeld) ?? null;
	const stopTurn = useCommand(assistant.chat.stopTurn);
	const chatRoot = useRef<HTMLDivElement>(null);
	const showCard = (key: string): void => scrollToCard(chatRoot.current, key);
	const typed = useTellsAgentActivity(chat);
	const drop = useDropsFiles();
	useSweepsAttachments(session.busy);
	const { Pinned, Strip } = cards;
	const isEmpty = session.turns.length === 0;
	const view = (
		<div
			className={`wg-studio-ai${isEmpty ? " is-empty" : ""}`}
			ref={chatRoot}
			data-link-home={chatId}
			onDragEnter={drop.onDragEnter}
			onDragOver={drop.onDragOver}
			onDragLeave={drop.onDragLeave}
			onDrop={drop.onDrop}
		>
			{isEmpty ? <BareLead lead={lead} /> : <ChatLeadHead lead={lead} title={title ?? TITLE} />}
			{isEmpty || chatId === undefined ? null : <ChatHead chatId={chatId} />}
			<ChatScroll key={chatId}>
				<ChatTurns chat={chat} cards={cards} asks={asks} chatId={chatId} report={report} />
				<QueueZone
					queued={chat.queued}
					actions={queueActions}
					onEdit={(queued) => void queueActions.hold(queued.id, true)}
				/>
			</ChatScroll>
			<ChatDock>
				<Pinned session={session} showCard={showCard} />
				<Strip showCard={showCard} />
				<FailureSaid failure={failure ?? setupFailure} />
				<Composer
					busy={session.busy}
					strip={
						<ChatPart>
							<ComposerFooter isEmpty={isEmpty} />
						</ChatPart>
					}
					fieldOptions={
						<ChatPart>
							<ComposerFieldOptions />
						</ChatPart>
					}
					meter={
						<ChatPart>
							<ComposerMeter />
						</ChatPart>
					}
					attached={change ? { label: change.label, onClear: () => setChange(null) } : null}
					onSend={asks.send}
					onStop={() => void stopTurn.run({ chat: chatId ?? null })}
					onTyped={typed}
					editing={editing}
					onSaveEdit={queueActions.saveEdit}
					onCancelEdit={() => {
						if (editing !== null) {
							void queueActions.hold(editing.id, false);
						}
					}}
				/>
			</ChatDock>
			<FileDropZone isOver={drop.isOver} />
		</div>
	);
	return (
		<PluginSlot name="chat.frame" props={{ chatId: chatId ?? null, children: view }}>
			{view}
		</PluginSlot>
	);
}
