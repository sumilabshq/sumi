import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Tooltip } from "radix-ui";

const SHOWN_AFTER_MS = 400;
const BELOW_PX = 10;
const WINDOW_EDGE_PX = 8;
const TRIGGER = "cv:relative cv:inline-flex cv:[--no-tooltip:true]";
const BUBBLE =
	"wg-portal cv:pointer-events-none cv:z-[var(--layer-tooltip)] cv:w-max cv:max-w-80 cv:rounded-lg cv:bg-ink cv:px-2.5 cv:py-1.5 cv:text-sm cv:leading-[1.35] cv:font-medium cv:text-page cv:motion-safe:animate-canvas-fade-in";

export function Tip({ label, children }: { readonly label: string; readonly children?: ReactNode }): ReactElement {
	return (
		<Tooltip.Provider delayDuration={SHOWN_AFTER_MS}>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<span className={TRIGGER} data-tip="">
						{children}
					</span>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content side="bottom" sideOffset={BELOW_PX} collisionPadding={WINDOW_EDGE_PX} className={BUBBLE}>
						{label}
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	);
}
