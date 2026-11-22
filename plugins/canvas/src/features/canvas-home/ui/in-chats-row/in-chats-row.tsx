import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Pressable } from "@widgetarium/kit";
import { useCanvasesInChats } from "../../lib/use-canvases-in-chats.js";
import { CanvasCard } from "../canvas-card/canvas-card.js";

export interface InChatsRowProps {
	readonly tabId: string;
	readonly words: string;
	readonly onOpenAll: () => void;
}

const TITLE = "Open in chats";
const ROW_MOST = 4;

export function InChatsRow({ tabId, words, onOpenAll }: InChatsRowProps): ReactElement | null {
	const inChats = useCanvasesInChats(words);

	if (inChats.length === 0) {
		return null;
	}

	return (
		<section className="sumi-canvas-home-section" aria-label={TITLE}>
			<div className="sumi-canvas-home-head">
				<h2>{TITLE}</h2>
				{inChats.length > ROW_MOST ? (
					<Pressable variant="quiet" tone="muted" className="sumi-canvas-home-quiet" onClick={onOpenAll}>
						Open all
					</Pressable>
				) : null}
			</div>
			<div className="sumi-canvas-home-row">
				{inChats.slice(0, ROW_MOST).map(({ row, chat }) => (
					<CanvasCard key={row.canvasId} tabId={tabId} row={row} chat={chat} />
				))}
			</div>
		</section>
	);
}
