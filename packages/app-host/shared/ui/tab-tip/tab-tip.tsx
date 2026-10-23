import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Tooltip } from "radix-ui";
import { TipProviderWhenAlone } from "@widgetarium/canvas";
import type { AppTab } from "../../schema/app-tab.schema.js";
import { STATUS_SAID, STATUS_TONE } from "../../lib/tab-status/tab-status.js";

export interface TabTipProps {
	readonly tab: AppTab;
	readonly side: "left" | "right" | "bottom";
	readonly children: ReactNode;
}

const SHOWN_AFTER_MS = 300;
const BESIDE_PX = 10;
const WINDOW_EDGE_PX = 8;
const TRIGGER = "cv:[--no-tooltip:true]";
const BUBBLE =
	"wg-portal cv:pointer-events-none cv:z-[var(--layer-tooltip)] cv:flex cv:w-max cv:max-w-72 cv:flex-col cv:gap-[3px] cv:rounded-[18px] cv:bg-primary cv:px-3.5 cv:pt-[9px] cv:pb-2.5 cv:text-sm cv:leading-[17px] cv:text-primary-foreground cv:motion-safe:animate-canvas-fade-in";
const SUBTITLE = "cv:opacity-70";

export function TabTip({ tab, side, children }: TabTipProps): ReactElement {
	return (
		<TipProviderWhenAlone>
			<Tooltip.Root delayDuration={SHOWN_AFTER_MS}>
				<Tooltip.Trigger asChild className={TRIGGER} data-tip="">
					{children}
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						side={side}
						sideOffset={BESIDE_PX}
						collisionPadding={WINDOW_EDGE_PX}
						className={BUBBLE}
						data-host-tab-tip=""
					>
						<span className="cv:font-medium">
							{tab.title}
							{tab.subtitle === null ? null : <span className={SUBTITLE}> · {tab.subtitle}</span>}
						</span>
						{tab.status === null ? null : (
							<span className={`cv:text-xs cv:leading-4 ${STATUS_TONE[tab.status]}`}>{STATUS_SAID[tab.status]}</span>
						)}
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</TipProviderWhenAlone>
	);
}
