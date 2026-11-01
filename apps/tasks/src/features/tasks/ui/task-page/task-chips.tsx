import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";
import { Badge, Popover, PopoverContent, PopoverTrigger } from "@widgetarium/kit";
import { KIND_WORDS } from "../../lib/task-words.js";
import { workingChatOf } from "../../lib/working-chat.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";
import { ChatChip } from "./chat-chip.js";
import { TaskProps } from "./task-props.js";

export interface TaskChipsProps {
	readonly view: TaskView;
}

const MORE = "+{count}";
const ALL_PROPERTIES = "All properties";
const ID_CREATED_AND_UPDATED = 3;

export function TaskChips({ view }: TaskChipsProps): ReactElement {
	const { card } = view;
	const workingChat = workingChatOf(card);
	const branch = card.branch ?? view.workplaces.find((place) => place.branch !== null)?.branch ?? null;
	return (
		<div className="wg-tasks-chips" data-tasks-chips="">
			<Badge variant="chip">
				<StatusGlyph status={card.status} />
				{card.statusLabel}
			</Badge>
			{workingChat === null ? null : <ChatChip chatId={workingChat} />}
			{branch === null ? null : (
				<Badge variant="chip" className="wg-tasks-mono">
					{branch}
				</Badge>
			)}
			<Badge variant="chip">{KIND_WORDS[card.kind]}</Badge>
			<Popover>
				<PopoverTrigger asChild>
					<Badge asChild variant="chip">
						<button type="button" aria-label={ALL_PROPERTIES} data-tasks-more-props="">
							{MORE.replace("{count}", String(restCountOf(view)))}
						</button>
					</Badge>
				</PopoverTrigger>
				<PopoverContent side="bottom" align="start" aria-label={ALL_PROPERTIES}>
					<div className="wg-tasks-props-pop" data-tasks-props-pop="">
						<TaskProps view={view} />
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

function restCountOf(view: TaskView): number {
	const rest = [view.workplaces.length > 0, view.parent !== null, view.card.waitsFor.length > 0];
	return rest.filter(Boolean).length + ID_CREATED_AND_UPDATED;
}
