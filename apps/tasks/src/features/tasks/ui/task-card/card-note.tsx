import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { BLOCKER_HEADS } from "../../lib/task-words.js";
import { NotePlate } from "./note-plate.js";

interface CardNoteProps {
	readonly card: TaskCard;
}

const BLOCKED = "Blocked";
const BLOCKED_BY = "Blocked by {tasks}";
const PAUSED = "Paused";
const WAITS_FOR = "Waits for {tasks}. No agent can start it before that.";

export function cardNoteOf(card: TaskCard): ReactElement | null {
	if (card.status === "blocked") {
		return <BlockedNote card={card} />;
	}

	if (card.status === "paused") {
		return <NotePlate tone="paused" head={null} body={`${PAUSED}: ${card.note ?? ""}`} card={card} />;
	}

	if (card.waitsFor.length > 0 && (card.status === "todo" || card.status === "backlog")) {
		return (
			<div className="wg-tasks-note" data-tone="wait">
				{WAITS_FOR.replace("{tasks}", card.waitsFor.join(", "))}
			</div>
		);
	}

	return null;
}

function BlockedNote({ card }: CardNoteProps): ReactElement {
	if (card.waitsFor.length > 0) {
		return (
			<NotePlate
				tone="blocked"
				head={null}
				body={`${BLOCKED_BY.replace("{tasks}", card.waitsFor.join(", "))}. ${card.note ?? ""}`}
				card={card}
			/>
		);
	}

	const head = card.blocker === null ? BLOCKED : BLOCKER_HEADS[card.blocker.kind];
	return card.actions.includes("continue") ? (
		<NotePlate tone="blocked" head={head} body={card.note ?? ""} card={card} />
	) : (
		<NotePlate tone="blocked" head={null} body={`${BLOCKED}: ${card.note ?? ""}`} card={card} />
	);
}
