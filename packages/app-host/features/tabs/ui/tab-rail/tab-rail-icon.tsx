import { createElement as h, useState } from "react";
import type { PointerEvent, ReactElement } from "react";
import { Popover, PopoverContent } from "@widgetarium/kit";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { LIFTED, LIFTED_PLATE, SHIFTS_WHILE_DRAGGED } from "../../../../shared/lib/tab-drag/tab-drag-look.js";
import { tabRowProps } from "../../../../shared/lib/tab-drag/tab-groups.js";
import { TabIcon } from "../../../../shared/ui/tab-face/tab-icon.js";
import { TabTip } from "../../../../shared/ui/tab-tip/tab-tip.js";
import { TabMenuItems } from "../tab-menu/tab-menu-items.js";

export interface TabRailIconProps {
	readonly tab: AppTabState;
	readonly tipSide: "left" | "right";
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onShow: () => void;
}

const PICK =
	"cv:flex-none cv:cursor-pointer cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:h-auto cv:text-ink cv:shadow-none cv:hover:bg-fill-hover cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

const HOLD = `cv:relative cv:flex cv:flex-none cv:rounded-full cv:[&>.wg-kit-anchor]:pointer-events-none cv:[&>.wg-kit-anchor]:absolute cv:[&>.wg-kit-anchor]:inset-0 ${SHIFTS_WHILE_DRAGGED} ${LIFTED} ${LIFTED_PLATE}`;

export function TabRailIcon({ tab, tipSide, onPointerDown, onShow }: TabRailIconProps): ReactElement {
	const [isMenuOpen, setMenuOpen] = useState(false);
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
					onContextMenu={(event) => {
						event.preventDefault();
						setMenuOpen(true);
					}}
					data-host-rail-tab={tab.id}
					data-host-tab-app={tab.app}
					data-host-tab-pinned={tab.isPinned || undefined}
				>
					<TabIcon tab={tab} look={tab.isShown ? "rail-shown" : "rail"} />
				</button>
			</TabTip>
			<Popover open={isMenuOpen} onOpenChange={setMenuOpen} placement="over" isPortaled>
				<PopoverContent>
					<TabMenuItems tab={tab} onPicked={() => setMenuOpen(false)} />
				</PopoverContent>
			</Popover>
		</span>
	);
}
