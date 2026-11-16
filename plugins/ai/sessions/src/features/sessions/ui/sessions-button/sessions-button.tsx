import { createElement as h, useContext, useState } from "react";
import type { ReactNode } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import { Icon, Popover, PopoverContent, PopoverTrigger } from "@widgetarium/kit";
import { WindowAppContext } from "../../lib/window-app-context.js";
import { SessionsList } from "../sessions-list/sessions-list.js";

const SESSIONS = "Sessions";
const ICON_PX = 16;

export interface SessionsButtonProps {
	readonly chatId: string | null;
}

export function SessionsButton({ chatId }: SessionsButtonProps): ReactNode {
	const [isOpen, setOpen] = useState(false);
	const windowApp = useContext(WindowAppContext);

	if (windowApp === null) {
		return null;
	}

	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<PopoverTrigger className="sumi-sessions-button" aria-label={SESSIONS} aria-haspopup="menu">
				<Icon name="menu" size={ICON_PX} />
			</PopoverTrigger>
			<PopoverContent side="bottom" align="start" className="sumi-sessions-pop">
				<RuntimeProvider runtime={windowApp}>
					<SessionsList currentChatId={chatId} onClose={() => setOpen(false)} />
				</RuntimeProvider>
			</PopoverContent>
		</Popover>
	);
}
