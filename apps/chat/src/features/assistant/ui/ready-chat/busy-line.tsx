import { createElement as h } from "react";
import type { ReactNode } from "react";
import type { Chat } from "@widgetarium/assistant";
import { LiveWithTasks } from "../active-tasks/live-with-tasks.js";
import { LiveStep } from "./live-step.js";

export interface BusyLineProps {
	readonly chat: Chat;
	readonly chatId?: string | undefined;
}

export function BusyLine({ chat, chatId }: BusyLineProps): ReactNode {
	if (!chat.session.busy || chat.session.turns.at(-1)?.role === "compact") {
		return null;
	}

	return (
		<div className="wg-studio-ai-live">
			{chatId === undefined ? (
				<LiveStep chat={chat} />
			) : (
				<LiveWithTasks chatId={chatId} step={<LiveStep chat={chat} />} />
			)}
		</div>
	);
}
