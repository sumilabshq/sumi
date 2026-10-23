import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { MenuOpening } from "../../../../shared/lib/menu-spot.js";
import type { PlanUsage } from "../../../../shared/schema/claude-options.schema.js";
import { GlassMenu } from "../../../../shared/ui/glass-menu/glass-menu.js";
import { GlassMenuNote } from "../../../../shared/ui/glass-menu/glass-menu-note.js";
import { UsageMeter } from "./usage-meter.js";

export interface UsageMenuProps {
	readonly opening: MenuOpening;
	readonly usage: PlanUsage | null;
}

const USAGE = "Usage";
const FIVE_HOURS = "This 5-hour window";
const WEEK = "This week";
const NOT_YET = "Claude Code reports its limits with each answer. They show here after the first one.";
const USAGE_MENU_PX = 300;

export function UsageMenu({ opening, usage }: UsageMenuProps): ReactElement {
	return (
		<GlassMenu spot={opening.spot} label={USAGE} width={USAGE_MENU_PX} onDismiss={opening.close}>
			{usage === null ? <GlassMenuNote>{NOT_YET}</GlassMenuNote> : null}
			{usage?.fiveHour ? (
				<UsageMeter title={FIVE_HOURS} used={usage.fiveHour.used} resetsAt={usage.fiveHour.resetsAt} />
			) : null}
			{usage?.week ? <UsageMeter title={WEEK} used={usage.week.used} resetsAt={usage.week.resetsAt} /> : null}
		</GlassMenu>
	);
}
