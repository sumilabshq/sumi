import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CHAT_CARD_PX } from "../../lib/grid-span.js";
import { useCanvasesInChats } from "../../lib/use-canvases-in-chats.js";
import { CanvasCard } from "../canvas-card/canvas-card.js";
import { VirtualGrid } from "../virtual-grid/virtual-grid.js";
import { WaitingCard } from "../waiting-card/waiting-card.js";

export interface InChatsGridProps {
	readonly tabId: string;
	readonly words: string;
	readonly scroller: HTMLElement | null;
}

const TITLE = "Open in chats";
const NONE_IN_CHATS = "No canvas found among those open in chats.";

function wantsNothing(): void {
	return undefined;
}

export function InChatsGrid({ tabId, words, scroller }: InChatsGridProps): ReactElement {
	const inChats = useCanvasesInChats(words);

	if (inChats.length === 0) {
		return <p className="sumi-canvas-home-none">{NONE_IN_CHATS}</p>;
	}

	return (
		<section className="sumi-canvas-home-section" aria-label={TITLE}>
			<VirtualGrid
				scroller={scroller}
				total={inChats.length}
				cardPx={CHAT_CARD_PX}
				itemAt={(index) => inChats[index]}
				onWanted={wantsNothing}
				drawItem={(held) =>
					held === undefined ? (
						<WaitingCard />
					) : (
						<CanvasCard tabId={tabId} row={held.row} chat={held.chat} />
					)
				}
			/>
		</section>
	);
}
