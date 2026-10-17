import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RESTING_TAB_LEAVES, SHOWN_TAB_LABEL_LEAVES } from "../../../../shared/lib/host-bar-steps/host-bar-steps.js";
import type { AppTab } from "../../../../shared/schema/app-tab.schema.js";
import { TabGlyph } from "../../../../shared/ui/tab-face/tab-glyph.js";
import { TabTip } from "../../../../shared/ui/tab-tip/tab-tip.js";

export type TabLook = "shown" | "resting" | "preview";

export interface AppTabButtonProps {
	readonly tab: AppTab;
	readonly look: TabLook;
	readonly onPick: () => void;
}

const TAB =
	"cv:flex cv:h-10 cv:min-w-10 cv:max-w-56 cv:flex-none cv:cursor-pointer cv:items-center cv:justify-center cv:gap-1.5 cv:rounded-full cv:border-0 cv:px-3 cv:font-[inherit] cv:text-sm cv:shadow-none cv:transition-[background-color,color] cv:duration-150 cv:ease-standard cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

const LOOK: Readonly<Record<TabLook, string>> = {
	shown: `${TAB} cv:bg-primary cv:font-medium cv:text-primary-foreground`,
	resting: `${TAB} ${RESTING_TAB_LEAVES} cv:bg-transparent cv:font-normal cv:text-ink cv:hover:bg-fill-hover`,
	preview: `${TAB} cv:bg-transparent cv:font-normal cv:italic cv:text-muted-foreground cv:hover:bg-fill-hover`,
};

const LABEL = `${SHOWN_TAB_LABEL_LEAVES} cv:truncate`;

export function AppTabButton({ tab, look, onPick }: AppTabButtonProps): ReactElement {
	return (
		<TabTip tab={tab} side="bottom">
			<button
				type="button"
				role="tab"
				aria-selected={look === "shown"}
				aria-label={tab.title}
				className={LOOK[look]}
				onClick={onPick}
				data-host-tab={tab.id}
			>
				<TabGlyph tab={tab} />
				{look === "resting" ? null : <span className={LABEL}>{tab.title}</span>}
			</button>
		</TabTip>
	);
}
