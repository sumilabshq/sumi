import { createElement as h, useState } from "react";
import type { PointerEvent, ReactElement } from "react";
import { Tip } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { LIFTED, LIFTED_PLATE, SHIFTS_WHILE_DRAGGED } from "../../../../shared/lib/tab-drag/tab-drag-look.js";
import { tabRowProps } from "../../../../shared/lib/tab-drag/tab-groups.js";
import { TabIcon } from "../../../../shared/ui/tab-face/tab-icon.js";
import { TabWords } from "../../../../shared/ui/tab-face/tab-words.js";
import { TabRowMenu } from "../tab-row-menu/tab-row-menu.js";

export interface TabListRowProps {
	readonly tab: AppTabState;
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onShow: () => void;
	readonly onClose: () => void;
}

const ROW = `cv:group cv:relative cv:flex cv:items-center cv:gap-0.5 cv:rounded-full cv:pe-1.5 ${SHIFTS_WHILE_DRAGGED} ${LIFTED}`;
const PICK =
	"cv:flex cv:min-w-0 cv:flex-1 cv:cursor-pointer cv:items-center cv:justify-start cv:h-auto cv:gap-2.5 cv:self-stretch cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:ps-3 cv:text-start cv:font-[inherit] cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const GRIP =
	"cv:pointer-events-none cv:absolute cv:inset-y-0 cv:start-1.5 cv:hidden cv:w-3.5 cv:items-center cv:justify-center cv:text-[var(--wg-studio-tabs-faint)] cv:group-hover:flex cv:group-data-[lifted]:flex";
const ROUND =
	"cv:grid cv:size-8 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:p-0 cv:shadow-none cv:opacity-0 cv:group-hover:opacity-100 cv:focus-visible:opacity-100 cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const MORE_OPEN = "cv:in-data-[state=open]:opacity-100";
// TRADE-OFF: dark hover borrows input; a theme step token would replace it
const LOOK = {
	shown: {
		row: "cv:bg-primary",
		pick: `${PICK} cv:text-primary-foreground cv:[&_span]:text-primary-foreground cv:[&_[data-host-tab-subtitle]]:opacity-65 cv:[&_[data-host-tab-status-said=reading]]:text-[color-mix(in_srgb,var(--brand)_50%,var(--primary-foreground))]`,
		more: `${ROUND} ${MORE_OPEN} cv:bg-transparent cv:text-primary-foreground cv:hover:bg-primary-foreground/15`,
		close: `${ROUND} cv:bg-transparent cv:text-primary-foreground cv:hover:bg-primary-foreground/15`,
	},
	resting: {
		row: `cv:not-data-[lifted]:hover:bg-fill-hover cv:[.theme-dark_&]:not-data-[lifted]:hover:bg-input ${LIFTED_PLATE}`,
		pick: PICK,
		more: `${ROUND} ${MORE_OPEN} cv:bg-transparent cv:text-muted-foreground cv:hover:bg-raise`,
		close: `${ROUND} cv:bg-raise cv:text-muted-foreground`,
	},
};
const CLOSE_TAB = "Close {title}";

export function TabListRow({ tab, onPointerDown, onShow, onClose }: TabListRowProps): ReactElement {
	const [isMenuOpen, setMenuOpen] = useState(false);
	const look = tab.isShown ? LOOK.shown : LOOK.resting;
	const closeSaid = CLOSE_TAB.replace("{title}", tab.title);
	return (
		<div
			className={`${ROW} ${tab.status === null ? "cv:min-h-10" : "cv:min-h-12"} ${look.row}`}
			{...tabRowProps(tab.id)}
			onContextMenu={(event) => {
				event.preventDefault();
				setMenuOpen(true);
			}}
			data-host-list-tab={tab.id}
			data-host-tab-app={tab.app}
			data-host-tab-pinned={tab.isPinned || undefined}
		>
			<button
				type="button"
				aria-current={tab.isShown || undefined}
				className={look.pick}
				onPointerDown={onPointerDown}
				onClick={onShow}
			>
				<span aria-hidden="true" className={GRIP} data-host-tab-grip="">
					<Icon name="grip-vertical" size={14} />
				</span>
				<TabIcon tab={tab} look="row" />
				<TabWords tab={tab} />
			</button>
			<TabRowMenu tab={tab} className={look.more} isOpen={isMenuOpen} onOpenChange={setMenuOpen} />
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
