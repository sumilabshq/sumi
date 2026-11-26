import { createElement as h, useContext } from "react";
import type { ReactNode } from "react";
import { RuntimeProvider } from "@widgetarium/data-framework";
import { Button, Icon, PopoverTrigger, tooltipMarks } from "@widgetarium/kit";
import { useChatTitle } from "../../lib/use-chat-title.js";
import { WindowAppContext } from "../../lib/window-app-context.js";
import { SESSIONS, SessionsPopover } from "../sessions-popover/sessions-popover.js";

const CHEVRON_PX = 14;

export interface ChatHeadTitleProps {
	readonly chatId: string;
}

export function ChatHeadTitle({ chatId }: ChatHeadTitleProps): ReactNode {
	const windowApp = useContext(WindowAppContext);

	if (windowApp === null) {
		return null;
	}

	return (
		<RuntimeProvider runtime={windowApp}>
			<TitleWithMenu chatId={chatId} />
		</RuntimeProvider>
	);
}

function TitleWithMenu({ chatId }: ChatHeadTitleProps): ReactNode {
	const title = useChatTitle(chatId);

	if (title === null) {
		return null;
	}

	return (
		<span className="sumi-chat-head-title">
			<span className="sumi-chat-head-title-text">{title}</span>
			<SessionsPopover
				chatId={chatId}
				side="bottom"
				align="start"
				trigger={
					<PopoverTrigger asChild aria-haspopup="menu">
						<Button
							shape="square"
							emphasis="ghost"
							size="sm"
							label={SESSIONS}
							className="sumi-chat-head-title-menu"
							{...tooltipMarks({ said: SESSIONS })}
						>
							<Icon name="chevron-down" size={CHEVRON_PX} />
						</Button>
					</PopoverTrigger>
				}
			/>
		</span>
	);
}
