import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CanvasRow } from "@sumi/artboards/contract";
import { Button, Icon, Pressable, tooltipMarks } from "@widgetarium/kit";
import { HOME_ICON, canvasHrefOf, chatHrefOf } from "../../../../shared/lib/canvas-links.js";
import { useOpensLink } from "../../../../shared/lib/use-opens-link.js";
import { cardMetaOf } from "../../lib/card-meta.js";
import type { CardChat } from "../../lib/use-canvases-in-chats.js";

export interface CanvasCardProps {
	readonly tabId: string;
	readonly row: CanvasRow;
	readonly chat: CardChat | null;
}

const COVER_ICON_PX = 20;
const CHIP_ICON_PX = 12;
const UNTITLED_CHAT = "Chat";
const TO_CHAT = "Go to the chat it is open in";

export function CanvasCard({ tabId, row, chat }: CanvasCardProps): ReactElement {
	const openLink = useOpensLink(tabId);
	return (
		<div className="sumi-canvas-card" data-canvas-card={row.canvasId}>
			<Pressable
				className="sumi-canvas-card-open"
				onClick={(event) => openLink(canvasHrefOf(row.canvasId), event.metaKey)}
			>
				<span className="sumi-canvas-card-cover" aria-hidden="true">
					<Icon name={HOME_ICON} size={COVER_ICON_PX} />
				</span>
				<span className="sumi-canvas-card-name">{row.title}</span>
				<span className="sumi-canvas-card-meta">{cardMetaOf(row, Date.now())}</span>
			</Pressable>
			{chat === null ? null : (
				<Button
					variant="tinted"
					className="sumi-canvas-card-chat"
					{...tooltipMarks({ said: TO_CHAT })}
					onClick={(event) => openLink(chatHrefOf(chat.id), event.metaKey)}
				>
					<span className="sumi-canvas-card-chat-dot" aria-hidden="true" />
					<span className="sumi-canvas-card-chat-name">{chat.title ?? UNTITLED_CHAT}</span>
					<Icon name="arrow-up-right" size={CHIP_ICON_PX} />
				</Button>
			)}
		</div>
	);
}
