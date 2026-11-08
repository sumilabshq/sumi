import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useChatTasks } from "../../lib/use-chat-tasks.js";
import { TaskRow } from "../task-row/task-row.js";

export function LiveTaskRows({ chatId }: { readonly chatId: string }): ReactElement {
	return (
		<Fragment>
			{useChatTasks(chatId).map((card) => (
				<TaskRow key={card.id} card={card} />
			))}
		</Fragment>
	);
}
