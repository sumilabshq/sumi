import { createElement as h, useContext, useState } from "react";
import type { ReactNode } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import { Popover, PopoverContent } from "@widgetarium/kit";
import { WindowAppContext } from "../../lib/window-app-context.js";
import { SessionsList } from "../sessions-list/sessions-list.js";

export const SESSIONS = "Sessions";

export interface SessionsPopoverProps {
	readonly chatId: string | null;
	readonly side: "top" | "bottom";
	readonly align: "start" | "end";
	readonly trigger: ReactNode;
}

export function SessionsPopover({ chatId, side, align, trigger }: SessionsPopoverProps): ReactNode {
	const [isOpen, setOpen] = useState(false);
	const windowApp = useContext(WindowAppContext);

	if (windowApp === null) {
		return null;
	}

	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			{trigger}
			<PopoverContent side={side} align={align} size="l" className="sumi-sessions-pop">
				<RuntimeProvider runtime={windowApp}>
					<SessionsList currentChatId={chatId} onClose={() => setOpen(false)} />
				</RuntimeProvider>
			</PopoverContent>
		</Popover>
	);
}
