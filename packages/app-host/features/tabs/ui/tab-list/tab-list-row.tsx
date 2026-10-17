import { createElement as h } from "react";
import type { PointerEvent, ReactElement } from "react";
import { treeRowProps } from "@widgetarium/behaviors";
import { Tip } from "@widgetarium/canvas";
import { Icon } from "@widgetarium/kit";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { TabIcon } from "../../../../shared/ui/tab-face/tab-icon.js";
import { TabWords } from "../../../../shared/ui/tab-face/tab-words.js";

export interface TabListRowProps {
	readonly tab: AppTabState;
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onShow: () => void;
	readonly onClose: () => void;
}

const ROW = "cv:group cv:relative cv:flex cv:items-center cv:gap-2.5 cv:rounded-full cv:pe-1.5";
const PICK =
	"cv:flex cv:min-w-0 cv:flex-1 cv:cursor-pointer cv:items-center cv:h-auto cv:gap-2.5 cv:self-stretch cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:ps-3 cv:text-start cv:font-[inherit] cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const GRIP =
	"cv:pointer-events-none cv:absolute cv:inset-y-0 cv:start-0 cv:hidden cv:w-3 cv:items-center cv:justify-center cv:text-muted-foreground/70 cv:group-hover:flex";
const CLOSE =
	"cv:grid cv:size-8 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:p-0 cv:shadow-none cv:opacity-0 cv:group-hover:opacity-100 cv:focus-visible:opacity-100 cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
// TRADE-OFF: dark hover borrows input; a theme step token would replace it
const LOOK = {
	shown: {
		row: "cv:bg-primary",
		pick: `${PICK} cv:text-primary-foreground cv:[&_span]:text-primary-foreground cv:[&_[data-host-tab-subtitle]]:opacity-65`,
		close: `${CLOSE} cv:bg-primary-foreground/15 cv:text-primary-foreground`,
	},
	resting: {
		row: "cv:hover:bg-fill-hover cv:[.theme-dark_&]:hover:bg-input",
		pick: PICK,
		close: `${CLOSE} cv:bg-raise cv:text-muted-foreground`,
	},
};
const CLOSE_TAB = "Close {title}";

export function TabListRow({ tab, onPointerDown, onShow, onClose }: TabListRowProps): ReactElement {
	const look = tab.isShown ? LOOK.shown : LOOK.resting;
	const closeSaid = CLOSE_TAB.replace("{title}", tab.title);
	return (
		<div
			className={`${ROW} ${tab.status === null ? "cv:min-h-10" : "cv:min-h-12"} ${look.row}`}
			{...treeRowProps({ id: tab.id, depth: 0, canHold: false, isHeld: false, scope: "tabs" })}
			data-host-list-tab={tab.id}
		>
			<button
				type="button"
				aria-current={tab.isShown || undefined}
				className={look.pick}
				onPointerDown={onPointerDown}
				onClick={onShow}
			>
				<span aria-hidden="true" className={GRIP}>
					<Icon name="grip-vertical" size={12} />
				</span>
				<TabIcon tab={tab} look="row" />
				<TabWords tab={tab} />
			</button>
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
