import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { ContinueLink } from "./continue-link.js";

export interface NotePlateProps {
	readonly tone: "blocked" | "paused";
	readonly head: string | null;
	readonly body: string;
	readonly card: TaskCard;
}

export function NotePlate({ tone, head, body, card }: NotePlateProps): ReactElement {
	const continues = card.actions.includes("continue");
	return (
		<div className="wg-tasks-note" data-tone={tone} data-acts={continues ? "" : undefined}>
			{head === null ? null : <div className="wg-tasks-note-head">{head}</div>}
			<span className="wg-tasks-note-body">{body}</span>
			{continues ? <ContinueLink card={card} /> : null}
		</div>
	);
}
