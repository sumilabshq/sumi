import { createElement as h } from "react";
import type { ReactNode } from "react";
import { Icon, IconButton, PopoverTrigger, tooltipMarks } from "@widgetarium/kit";
import { SESSIONS, SessionsPopover } from "../sessions-popover/sessions-popover.js";

const CHEVRON_PX = 16;

export interface SessionsChevronProps {
	readonly chatId: string;
}

export function SessionsChevron({ chatId }: SessionsChevronProps): ReactNode {
	return (
		<SessionsPopover
			chatId={chatId}
			side="bottom"
			align="start"
			trigger={
				<PopoverTrigger asChild aria-haspopup="menu">
					<IconButton
						variant="ghost"
						size="xs"
						label={SESSIONS}
						className="sumi-sessions-chevron"
						{...tooltipMarks({ said: SESSIONS })}
					>
						<Icon name="chevron-down" size={CHEVRON_PX} />
					</IconButton>
				</PopoverTrigger>
			}
		/>
	);
}
