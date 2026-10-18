import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { CardAsks, ChatCardsSlot, PinnedCardProps } from "@widgetarium/assistant";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { OpenByBuild } from "../legacy/assistant/cards/build-progress.js";
import { JobsStrip } from "../legacy/assistant/cards/jobs-strip.js";
import { cardsAround, pinnedCardOf } from "../legacy/assistant/cards/turn-cards.js";
import type { CardAsks as LegacyCardAsks } from "../legacy/assistant/cards/turn-cards.js";

const NOT_BUILT = "the build could not be started";
const NOT_APPROVED = "the design could not be approved";

export function chatCardsOver(port: AssistantPort): ChatCardsSlot {
	return {
		around: (cards, turn, asks) => cardsAround(cards, turn, legacyAsksOf(port, asks)),
		Pinned: (props) => <PinnedCard port={port} {...props} />,
		Strip: ({ showCard }) => <JobsStrip jobs={port} showCard={showCard} />,
	};
}

function PinnedCard({
	port,
	cards,
	showCard,
}: PinnedCardProps & { readonly port: AssistantPort }): ReactElement | null {
	const [openByBuild] = useState<OpenByBuild>(() => new Map());
	const pinned = pinnedCardOf(cards.pinned, { port, openByBuild, showCard });

	if (!pinned) {
		return null;
	}

	return <div className="wg-studio-ai-pinned">{pinned}</div>;
}

function legacyAsksOf(port: AssistantPort, asks: CardAsks): LegacyCardAsks {
	return {
		port,
		report: asks.report,
		send: (said) => asks.send(said),
		attach: (change) => asks.attach(change),
		buildIt: (app) => asks.runDetached(() => port.buildIt(app), NOT_BUILT),
		approveDesign: (app) => asks.runDetached(() => port.approveDesign(app), NOT_APPROVED),
	};
}
