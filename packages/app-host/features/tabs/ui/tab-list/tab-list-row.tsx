import { createElement as h } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { Tip } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { LIFTED, LIFTED_PLATE, SHIFTS_WHILE_DRAGGED } from "../../../../shared/lib/tab-drag/tab-drag-look.js";
import { tabRowProps } from "../../../../shared/lib/tab-drag/tab-groups.js";
import { TabRowPick } from "./tab-row-pick.js";
import { TabRowRenaming } from "./tab-row-renaming.js";

export interface TabListRowProps {
	readonly tab: AppTabState;
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onShow: () => void;
	readonly onClose: () => void;
	readonly onMenu: (event: MouseEvent<HTMLElement>) => void;
	readonly isRenaming: boolean;
	readonly onRenamed: () => void;
}

const ROW = `cv:group cv:relative cv:flex cv:items-center cv:gap-0.5 cv:rounded-full cv:pe-1.5 ${SHIFTS_WHILE_DRAGGED} ${LIFTED}`;
const PICK =
	"cv:flex cv:min-w-0 cv:flex-1 cv:cursor-pointer cv:items-center cv:justify-start cv:h-auto cv:gap-2.5 cv:self-stretch cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:ps-3 cv:text-start cv:font-[inherit] cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const ROUND =
	"cv:grid cv:size-8 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:p-0 cv:shadow-none cv:opacity-0 cv:group-hover:opacity-100 cv:focus-visible:opacity-100 cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
// TRADE-OFF: dark hover borrows input; a theme step token would replace it
const LOOK = {
	shown: {
		row: "cv:bg-primary",
		pick: `${PICK} cv:text-primary-foreground cv:[&_span]:text-primary-foreground cv:[&_[data-host-tab-subtitle]]:opacity-65 cv:[&_[data-host-tab-status-said=reading]]:text-[color-mix(in_srgb,var(--brand)_50%,var(--primary-foreground))]`,
		close: `${ROUND} cv:bg-transparent cv:text-primary-foreground cv:hover:bg-primary-foreground/15`,
	},
	resting: {
		row: `cv:not-data-[lifted]:hover:bg-fill-hover cv:[.theme-dark_&]:not-data-[lifted]:hover:bg-input ${LIFTED_PLATE}`,
		pick: PICK,
		close: `${ROUND} cv:bg-raise cv:text-muted-foreground`,
	},
};
const CLOSE_TAB = "Close {title}";

export function TabListRow(row: TabListRowProps): ReactElement {
	const { tab, onClose, onMenu } = row;
	const look = tab.isShown ? LOOK.shown : LOOK.resting;
	const closeSaid = CLOSE_TAB.replace("{title}", tab.title);
	return (
		<div
			className={`${ROW} ${tab.status === null ? "cv:min-h-10" : "cv:min-h-12"} ${look.row}`}
			{...tabRowProps(tab.id)}
			onContextMenu={onMenu}
			data-host-list-tab={tab.id}
			data-host-tab-app={tab.app}
			data-host-tab-pinned={tab.isPinned || undefined}
		>
			{row.isRenaming ? (
				<TabRowRenaming tab={tab} className={look.pick} onRenamed={row.onRenamed} />
			) : (
				<TabRowPick tab={tab} className={look.pick} onPointerDown={row.onPointerDown} onShow={row.onShow} />
			)}
			<Tip label={closeSaid}>
				<button
					type="button"
					className={look.close}
					aria-label={closeSaid}
					onClick={onClose}
					data-host-close-tab={tab.id}
				>
					<Icon name="x" size={14} />
				</button>
			</Tip>
		</div>
	);
}
