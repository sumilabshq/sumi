import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ChatTaskLineQuery } from "@widgetarium/tasks";
import { useOptionalQuery } from "@widgetarium/core/requests";
import { Collapsible, CollapsibleContent } from "@widgetarium/kit";
import type { ChatTask } from "../../lib/chat-task-context.js";
import { StatusGlyph } from "../../../tasks/ui/status-glyph/status-glyph.js";
import { TaskLineSaid } from "./task-line-said.js";

const OPEN_TASK = "Open task {id}";
const ALSO_OPEN = "+{count}";

export interface TaskLineOfProps {
	readonly chatTask: ChatTask;
}

export function TaskLineOf({ chatTask }: TaskLineOfProps): ReactElement {
	const line = useOptionalQuery(ChatTaskLineQuery, { chat: chatTask.chatId }).data;
	const card = line?.card ?? null;
	return (
		<Collapsible open={card !== null} data-tasks-fold="">
			<CollapsibleContent>
				{card === null ? null : (
					<button
						type="button"
						className="wg-tasks-line"
						data-tasks-line={card.status}
						data-your-turn={card.isYourTurn ? "" : undefined}
						aria-label={OPEN_TASK.replace("{id}", card.id)}
						onClick={() => chatTask.openTask(card.id)}
					>
						<span key={`${card.id}:${card.status}`} className="wg-tasks-line-body">
							<StatusGlyph status={card.status} />
							<TaskLineSaid card={card} />
							{line?.alsoOpen === undefined || line.alsoOpen === 0 ? null : (
								<span className="wg-tasks-t3">{ALSO_OPEN.replace("{count}", String(line.alsoOpen))}</span>
							)}
							<span className="wg-tasks-t3" aria-hidden="true">
								›
							</span>
						</span>
					</button>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}
