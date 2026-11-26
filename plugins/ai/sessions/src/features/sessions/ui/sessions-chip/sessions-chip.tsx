import { createElement as h, useContext } from "react";
import type { ReactNode } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import { Icon, Pressable, PopoverTrigger, tooltipMarks } from "@widgetarium/kit";
import { useChatTitle } from "../../lib/use-chat-title.js";
import { WindowAppContext } from "../../lib/window-app-context.js";
import { SESSIONS, SessionsPopover } from "../sessions-popover/sessions-popover.js";

const CHEVRON_PX = 14;

export interface SessionsChipProps {
	readonly chatId: string;
}

export function SessionsChip({ chatId }: SessionsChipProps): ReactNode {
	const windowApp = useContext(WindowAppContext);

	if (windowApp === null) {
		return null;
	}

	return (
		<RuntimeProvider runtime={windowApp}>
			<TitleChip chatId={chatId} />
		</RuntimeProvider>
	);
}

function TitleChip({ chatId }: SessionsChipProps): ReactNode {
	const title = useChatTitle(chatId);

	if (title === null) {
		return null;
	}

	return (
		<SessionsPopover
			chatId={chatId}
			side="bottom"
			align="start"
			trigger={
				<PopoverTrigger asChild aria-haspopup="menu">
					<Pressable className="sumi-sessions-chip" {...tooltipMarks({ said: SESSIONS })}>
						<span className="sumi-sessions-chip-title">{title}</span>
						<Icon name="chevron-down" size={CHEVRON_PX} />
					</Pressable>
				</PopoverTrigger>
			}
		/>
	);
}
