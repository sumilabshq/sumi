import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard as Card } from "@widgetarium/tasks";
import { Collapsible, CollapsibleContent } from "@widgetarium/kit";
import { KIND_WORDS } from "../../lib/task-words.js";
import { ageOf } from "../../lib/task-times.js";
import type { OpenTask } from "../../lib/use-open-task.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";
import { cardNoteOf } from "./card-note.js";
import { CardProgress } from "./card-progress.js";

export interface TaskCardProps {
	readonly card: Card;
	readonly openTask: OpenTask;
}

const OPEN_TASK = "Open {id}";
const WAITING = "waiting {days} days";

export function TaskCard({ card, openTask }: TaskCardProps): ReactElement {
	const note = cardNoteOf(card);
	return (
		<div
			className="wg-tasks-card"
			role="link"
			tabIndex={0}
			aria-label={OPEN_TASK.replace("{id}", card.id)}
			data-tasks-card={card.id}
			data-tasks-glide={`card:${card.id}`}
			data-status={card.status}
			data-your-turn={card.isYourTurn ? "" : undefined}
			onClick={() => openTask(card.id)}
			onKeyDown={(event) => event.key === "Enter" && openTask(card.id)}
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
		</div>
	);
}

function ageSaidOf(card: Card): string {
	return card.quietDays === null
		? ageOf(card.updatedAt, Date.now())
		: WAITING.replace("{days}", String(card.quietDays));
}
