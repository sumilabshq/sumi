import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard as Card } from "@widgetarium/tasks";
import { Collapsible, CollapsibleContent } from "@widgetarium/kit";
import { KIND_WORDS } from "../../lib/task-words.js";
import { ageOf } from "../../lib/task-times.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";
import { cardNoteOf } from "./card-note.js";
import { CardProgress } from "./card-progress.js";

export interface TaskCardProps {
	readonly card: Card;
}

const OPEN_TASK = "Open {id}";
const WAITING = "waiting {days} days";

export function TaskCard({ card }: TaskCardProps): ReactElement {
	const note = cardNoteOf(card);
	return (
		<a
			href={`/${card.id}`}
			className="wg-tasks-card"
			aria-label={OPEN_TASK.replace("{id}", card.id)}
			data-tasks-card={card.id}
			data-tasks-glide={`card:${card.id}`}
			data-status={card.status}
			data-your-turn={card.isYourTurn ? "" : undefined}
		>
			<div className="wg-tasks-meta">
				<StatusGlyph status={card.status} />
				<span className="wg-tasks-mono">{card.id}</span>
				<span className="wg-tasks-t3">·</span>
				<span>{KIND_WORDS[card.kind]}</span>
				<span className="wg-tasks-fill" />
				<span className="wg-tasks-t3" data-tasks-quiet={card.quietDays === null ? undefined : ""}>
					{ageSaidOf(card)}
				</span>
			</div>
			<div className="wg-tasks-card-title">{card.title}</div>
			<Collapsible open={note !== null} data-tasks-fold="">
				<CollapsibleContent>{note}</CollapsibleContent>
			</Collapsible>
			{card.isClosed ? null : <CardProgress card={card} />}
			{card.branch === null || card.isClosed ? null : (
				<div>
					<span className="wg-tasks-chip wg-tasks-mono">{card.branch}</span>
				</div>
			)}
		</a>
	);
}

function ageSaidOf(card: Card): string {
	return card.quietDays === null
		? ageOf(card.updatedAt, Date.now())
		: WAITING.replace("{days}", String(card.quietDays));
}
