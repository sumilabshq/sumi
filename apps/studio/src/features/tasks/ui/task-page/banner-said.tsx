import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { BlockedSaid } from "./blocked-said.js";

export interface BannerSaidProps {
	readonly card: TaskCard;
}

const YOUR_TURN = "Your turn.";

export function BannerSaid({ card }: BannerSaidProps): ReactElement | null {
	if (card.status === "blocked") {
		return <BlockedSaid card={card} />;
	}

	const said = [card.isYourTurn ? YOUR_TURN : null, card.note].filter(Boolean).join(" ");
	return said === "" ? null : <span className="wg-tasks-banner-said">{said}</span>;
}
