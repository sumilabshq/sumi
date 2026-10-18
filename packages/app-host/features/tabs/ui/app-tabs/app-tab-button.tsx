import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Tip } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import { RESTING_TAB_LEAVES, SHOWN_TAB_LABEL_LEAVES } from "../../../../shared/lib/host-bar-steps/host-bar-steps.js";
import type { AppTab } from "../../../../shared/schema/app-tab.schema.js";
import { TabGlyph } from "../../../../shared/ui/tab-face/tab-glyph.js";
import { TabTip } from "../../../../shared/ui/tab-tip/tab-tip.js";

export type TabLook = "shown" | "resting" | "preview";

export interface AppTabButtonProps {
	readonly tab: AppTab;
	readonly look: TabLook;
	readonly onPick: () => void;
	readonly onClose: () => void;
	readonly onMenu?: (event: MouseEvent<HTMLElement>) => void;
}

const HOLD = "cv:group/tab cv:relative cv:flex cv:min-w-0 cv:flex-none";
const HOLD_LOOK: Readonly<Record<TabLook, string>> = {
	shown: `${HOLD} cv:shrink`,
	resting: `${HOLD} ${RESTING_TAB_LEAVES}`,
	preview: `${HOLD} cv:shrink`,
};
const TAB =
	"cv:flex cv:h-10 cv:min-w-10 cv:max-w-56 cv:flex-none cv:cursor-pointer cv:items-center cv:justify-center cv:gap-1.5 cv:rounded-full cv:border-0 cv:px-3 cv:font-[inherit] cv:text-sm cv:shadow-none cv:transition-[background-color,color] cv:duration-150 cv:ease-standard cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";
const LOOK: Readonly<Record<TabLook, string>> = {
	shown: `${TAB} cv:min-w-0 cv:shrink cv:pe-8 cv:@max-[400px]/app-host-bar:pe-3 cv:bg-primary cv:font-medium cv:text-primary-foreground`,
	resting: `${TAB} cv:bg-transparent cv:font-normal cv:text-ink cv:hover:bg-fill-hover`,
	preview: `${TAB} cv:bg-transparent cv:font-normal cv:italic cv:text-muted-foreground cv:hover:bg-fill-hover`,
};
const CLOSE =
	"cv:absolute cv:grid cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:p-0 cv:shadow-none cv:transition-[background-color,color,opacity] cv:duration-150 cv:ease-standard cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const CLOSE_LOOK: Readonly<Record<TabLook, string>> = {
	shown: `${CLOSE} cv:end-1.5 cv:top-1/2 cv:size-5 cv:-translate-y-1/2 cv:bg-transparent cv:text-primary-foreground/65 cv:hover:bg-primary-foreground/15 cv:hover:text-primary-foreground cv:@max-[400px]/app-host-bar:hidden`,
	resting: `${CLOSE} cv:end-0.5 cv:top-0.5 cv:size-4 cv:bg-raise cv:text-muted-foreground cv:shadow-[0_0_0_1px_var(--border)] cv:pointer-events-none cv:opacity-0 cv:hover:text-ink cv:group-hover/tab:pointer-events-auto cv:group-hover/tab:opacity-100 cv:focus-visible:opacity-100`,
	preview: `${CLOSE} cv:end-0.5 cv:top-0.5 cv:size-4 cv:bg-raise cv:text-muted-foreground cv:pointer-events-none cv:opacity-0 cv:group-hover/tab:pointer-events-auto cv:group-hover/tab:opacity-100`,
};
const CLOSE_GLYPH_PX: Readonly<Record<TabLook, number>> = {
	shown: 12,
	resting: 10,
	preview: 10,
};
const LABEL = `${SHOWN_TAB_LABEL_LEAVES} cv:truncate`;
const CLOSE_TAB = "Close {title}";
const MIDDLE_BUTTON = 1;

export function AppTabButton({ tab, look, onPick, onClose, onMenu }: AppTabButtonProps): ReactElement {
	const closeSaid = CLOSE_TAB.replace("{title}", tab.title);
	const closeOnMiddle = (event: MouseEvent): void => {
		if (event.button === MIDDLE_BUTTON) {
			event.preventDefault();
			onClose();
		}
	};
	return (
		<span className={HOLD_LOOK[look]} data-host-tab-hold={tab.id}>
			<TabTip tab={tab} side="bottom">
				<button
					type="button"
					role="tab"
					aria-selected={look === "shown"}
					aria-label={tab.title}
					className={LOOK[look]}
					onClick={onPick}
					onMouseDown={(event) => {
						if (event.button === MIDDLE_BUTTON) event.preventDefault();
					}}
					onAuxClick={closeOnMiddle}
					onContextMenu={onMenu}
					data-host-tab={tab.id}
					data-host-tab-app={tab.app}
				>
					<TabGlyph tab={tab} />
					{look === "resting" ? null : <span className={LABEL}>{tab.title}</span>}
				</button>
			</TabTip>
			<Tip label={closeSaid}>
				<button
					type="button"
					className={CLOSE_LOOK[look]}
					aria-label={closeSaid}
					onClick={onClose}
					data-host-tab-close={tab.id}
				>
					<Icon name="x" size={CLOSE_GLYPH_PX[look]} />
				</button>
			</Tip>
		</span>
	);
}
