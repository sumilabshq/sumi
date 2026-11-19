import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CanvasRow } from "@sumi/artboards/contract";
import { tooltipMarks } from "@widgetarium/kit";
import { canvasHrefOf, chatHrefOf } from "../../../../shared/lib/canvas-links.js";
import { useOpensLink } from "../../../../shared/lib/use-opens-link.js";
import { cardMetaOf } from "../../lib/card-meta.js";
import type { CardChat } from "../../lib/use-canvases-in-chats.js";
import { CardSketch } from "../card-sketch/card-sketch.js";

export interface CanvasCardProps {
	readonly tabId: string;
	readonly row: CanvasRow;
	readonly chat: CardChat | null;
}

const UNTITLED_CHAT = "Chat";
const TO_CHAT = "Go to the chat it is open in";

export function CanvasCard({ tabId, row, chat }: CanvasCardProps): ReactElement {
	const openLink = useOpensLink(tabId);
	return (
		<div className="sumi-canvas-card" data-canvas-card={row.canvasId}>
			<button
				type="button"
				className="sumi-canvas-card-open"
				onClick={(event) => openLink(canvasHrefOf(row.canvasId), event.metaKey)}
			>
				<CardSketch boxes={row.sketch} />
				<span className="sumi-canvas-card-name">{row.title}</span>
				<span className="sumi-canvas-card-meta">{cardMetaOf(row, Date.now())}</span>
			</button>
			{chat === null ? null : (
				<button
					type="button"
					className="sumi-canvas-card-chat"
					{...tooltipMarks({ said: TO_CHAT })}
					onClick={(event) => openLink(chatHrefOf(chat.id), event.metaKey)}
				>
					<span className="sumi-canvas-card-chat-dot" aria-hidden="true" />
					<span className="sumi-canvas-card-chat-name">{chat.title ?? UNTITLED_CHAT}</span>
				</button>
			)}
		</div>
	);
}
