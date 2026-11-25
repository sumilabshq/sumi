import { createElement as h } from "react";
import type { ReactNode } from "react";
import { Button, Icon, PopoverTrigger, tooltipMarks } from "@widgetarium/kit";
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
					<Button
						shape="square"
						emphasis="ghost"
						size="xs"
						label={SESSIONS}
						className="sumi-sessions-chevron"
						{...tooltipMarks({ said: SESSIONS })}
					>
						<Icon name="chevron-down" size={CHEVRON_PX} />
					</Button>
				</PopoverTrigger>
			}
		/>
	);
}
