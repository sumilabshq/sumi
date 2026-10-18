import { createElement as h } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { LIFTED, LIFTED_PLATE, SHIFTS_WHILE_DRAGGED } from "../../../../shared/lib/tab-drag/tab-drag-look.js";
import { tabRowProps } from "../../../../shared/lib/tab-drag/tab-groups.js";
import { TabIcon } from "../../../../shared/ui/tab-face/tab-icon.js";
import { TabTip } from "../../../../shared/ui/tab-tip/tab-tip.js";

export interface TabRailIconProps {
	readonly tab: AppTabState;
	readonly tipSide: "left" | "right";
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onShow: () => void;
	readonly onMenu: (event: MouseEvent<HTMLElement>) => void;
}

const PICK =
	"cv:flex-none cv:cursor-pointer cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:h-auto cv:text-ink cv:shadow-none cv:hover:bg-fill-hover cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

const HOLD = `cv:relative cv:flex cv:flex-none cv:rounded-full ${SHIFTS_WHILE_DRAGGED} ${LIFTED} ${LIFTED_PLATE}`;

export function TabRailIcon({ tab, tipSide, onPointerDown, onShow, onMenu }: TabRailIconProps): ReactElement {
	return (
		<span className={HOLD} {...tabRowProps(tab.id)}>
			<TabTip tab={tab} side={tipSide}>
				<button
					type="button"
					aria-label={tab.title}
					aria-current={tab.isShown || undefined}
					className={PICK}
					onPointerDown={onPointerDown}
					onClick={onShow}
					onContextMenu={onMenu}
					data-host-rail-tab={tab.id}
					data-host-tab-app={tab.app}
					data-host-tab-pinned={tab.isPinned || undefined}
				>
					<TabIcon tab={tab} look={tab.isShown ? "rail-shown" : "rail"} />
				</button>
			</TabTip>
		</span>
	);
}
