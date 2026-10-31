import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { ChatTaskContext } from "../../lib/chat-task-context.js";
import { TaskLineOf } from "./task-line-of.js";

export function ChatTaskLine(): ReactElement | null {
	const chatTask = useContext(ChatTaskContext);
	return chatTask === null ? null : <TaskLineOf chatTask={chatTask} />;
}
