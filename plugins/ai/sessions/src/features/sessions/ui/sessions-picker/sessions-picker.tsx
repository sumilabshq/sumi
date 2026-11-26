import { createElement as h } from "react";
import type { ReactNode } from "react";
import { SelectTrigger } from "@widgetarium/kit";
import { SESSIONS, SessionsPopover } from "../sessions-popover/sessions-popover.js";

export interface SessionsPickerProps {
	readonly chat: string | null;
}

export function SessionsPicker({ chat }: SessionsPickerProps): ReactNode {
	return (
		<SessionsPopover
			chatId={chat}
			side="top"
			align="end"
			trigger={<SelectTrigger variant="ghost">{SESSIONS}</SelectTrigger>}
		/>
	);
}
