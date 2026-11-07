import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MessageScrollerItem } from "@widgetarium/kit";
import type { ShownTurn } from "@widgetarium/assistant";
import { CompactLine } from "../compact-line/compact-line.js";
import { Turn } from "../turn/turn.js";
import type { CardsAround } from "../../lib/chat-cards-slot.js";
import { renderMarkdown } from "../../lib/render-markdown.js";
import { CardsOnly } from "./cards-only.js";

export interface TurnRowProps {
	readonly shown: ShownTurn;
	readonly at: number;
	readonly around: CardsAround;
	readonly isLive: boolean;
	readonly hasLiveGroup: boolean;
	readonly isEmptied: boolean;
}

export function TurnRow({ shown, at, around, isLive, hasLiveGroup, isEmptied }: TurnRowProps): ReactElement {
	if (isEmptied) {
		return <CardsOnly around={around} />;
	}

	return (
		<MessageScrollerItem messageId={`turn-${at}`} className="wg-studio-ai-row">
			{around.before}
			{shown.turn.role === "compact" ? (
				<CompactLine turn={shown.turn} render={renderMarkdown} live={isLive} />
			) : (
				<Turn shown={shown} render={renderMarkdown} live={isLive} hasLiveGroup={hasLiveGroup} />
			)}
			{around.after}
		</MessageScrollerItem>
	);
}
