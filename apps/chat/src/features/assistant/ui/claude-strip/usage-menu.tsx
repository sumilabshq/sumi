import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { MenuOpening } from "../../lib/menu-spot.js";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import { ChatMenuNote } from "../chat-menu/chat-menu-note.js";
import { UsageMeter } from "./usage-meter.js";
import type { PlanUsage } from "@widgetarium/assistant";

export interface UsageMenuProps {
	readonly opening: MenuOpening;
	readonly usage: PlanUsage | null;
}

const USAGE = "Usage";
const FIVE_HOURS = "This 5-hour window";
const WEEK = "This week";
const NOT_YET = "Claude Code reports its limits with each answer. They show here after the first one.";

export function UsageMenu({ opening, usage }: UsageMenuProps): ReactElement {
	return (
		<ChatMenu spot={opening.spot} label={USAGE} onDismiss={opening.close}>
			{usage === null ? <ChatMenuNote>{NOT_YET}</ChatMenuNote> : null}
			{usage?.fiveHour ? (
				<UsageMeter title={FIVE_HOURS} used={usage.fiveHour.used} resetsAt={usage.fiveHour.resetsAt} />
			) : null}
			{usage?.week ? <UsageMeter title={WEEK} used={usage.week.used} resetsAt={usage.week.resetsAt} /> : null}
		</ChatMenu>
	);
}
