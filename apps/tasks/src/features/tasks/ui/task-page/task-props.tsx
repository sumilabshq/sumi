import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { TaskView } from "@widgetarium/tasks";
import { Icon } from "@widgetarium/kit";
import { agoOf, dayAndClockOf } from "../../lib/task-times.js";
import { KIND_WORDS } from "../../lib/task-words.js";
import { workingChatOf } from "../../lib/working-chat.js";
import { StatusGlyph } from "../status-glyph/status-glyph.js";
import { ChatLink } from "./chat-link.js";
import { ChatLinks } from "./chat-links.js";
import { NoneSaid } from "./none-said.js";
import { TaskId } from "./task-id.js";
import { TaskProp } from "./task-prop.js";

export interface TaskPropsProps {
	readonly view: TaskView;
}

export function TaskProps({ view }: TaskPropsProps): ReactElement {
	const { card } = view;
	const workingChat = workingChatOf(card);
	const now = Date.now();
	return (
		<Fragment>
			<TaskProp name="Id">
				<TaskId id={card.id} />
			</TaskProp>
			<TaskProp name="Status">
				<span className="wg-tasks-inline">
					<StatusGlyph status={card.status} />
					{card.statusLabel}
				</span>
			</TaskProp>
			<TaskProp name="Kind">{KIND_WORDS[card.kind]}</TaskProp>
			{workingChat === null ? null : (
				<TaskProp name="Working chat">
					<ChatLink chatId={workingChat} />
				</TaskProp>
			)}
			<TaskProp name="Touched by">
				{view.chats.length === 0 ? <NoneSaid /> : <ChatLinks chatIds={view.chats} />}
			</TaskProp>
			<div className="wg-tasks-side-line" />
			<TaskProp name="Workplaces">
				{view.workplaces.length === 0 ? <NoneSaid /> : null}
				{view.workplaces.map((place) => (
					<span key={place.folder} className="wg-tasks-place">
						<span className="wg-tasks-mono">{place.folder}</span>
						{place.branch === null ? null : (
							<span className="wg-tasks-chip wg-tasks-mono">
								<Icon name="git-branch" size={12} />
								{place.branch}
							</span>
						)}
						{place.worktree === null ? null : <span className="wg-tasks-mono wg-tasks-t2">{place.worktree}</span>}
					</span>
				))}
			</TaskProp>
			<TaskProp name="Parent">{view.parent ?? <NoneSaid />}</TaskProp>
			<TaskProp name="Blocked by">{card.waitsFor.length === 0 ? <NoneSaid /> : card.waitsFor.join(", ")}</TaskProp>
			<div className="wg-tasks-side-line" />
			<TaskProp name="Created">
				<span className="wg-tasks-t2" data-tasks-created="">
					{dayAndClockOf(view.createdAt, now)}
				</span>
			</TaskProp>
			<TaskProp name="Updated">
				<span className="wg-tasks-t2">{agoOf(card.updatedAt, now)}</span>
			</TaskProp>
		</Fragment>
	);
}
