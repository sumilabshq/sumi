import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { BLOCKER_HEADS } from "../../lib/task-words.js";

export interface BlockedSaidProps {
	readonly card: TaskCard;
}

export function BlockedSaid({ card }: BlockedSaidProps): ReactElement {
	const head = card.blocker === null ? null : BLOCKER_HEADS[card.blocker.kind];
	return (
		<span className="wg-tasks-banner-said" data-tone="blocked">
			{[head, card.note].filter(Boolean).join(" · ")}
		</span>
	);
}
