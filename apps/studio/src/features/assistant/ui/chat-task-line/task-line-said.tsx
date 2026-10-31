import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { BlockedLineSaid } from "./blocked-line-said.js";
import { PausedLineSaid } from "./paused-line-said.js";
import { ReadyLineSaid } from "./ready-line-said.js";
import { WorkingSaid } from "./working-said.js";

export interface TaskLineSaidProps {
	readonly card: TaskCard;
}

export function TaskLineSaid({ card }: TaskLineSaidProps): ReactElement {
	if (card.status === "blocked") {
		return <BlockedLineSaid card={card} />;
	}

	if (card.status === "paused") {
		return <PausedLineSaid card={card} />;
	}

	if (card.status === "ready_to_test") {
		return <ReadyLineSaid card={card} />;
	}

	return <WorkingSaid card={card} />;
}
