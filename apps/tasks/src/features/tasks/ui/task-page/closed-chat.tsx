import { createElement as h } from "react";
import type { ReactElement } from "react";
import { tooltipMarks } from "@widgetarium/kit";

export interface ClosedChatProps {
	readonly chatId: string;
}

const CLOSED = "Closed chat";

export function ClosedChat({ chatId }: ClosedChatProps): ReactElement {
	return (
		<span className="wg-tasks-t3" data-tasks-closed-chat={chatId} {...tooltipMarks({ said: chatId })}>
			{CLOSED}
		</span>
	);
}
