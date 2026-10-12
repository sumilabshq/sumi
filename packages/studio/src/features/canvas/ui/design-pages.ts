import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@widgetarium/kit";
import type { Size } from "../local/frame-size.js";
import type { Drawing, DrawnScreen } from "../local/design-canvas-shapes.js";
import { Group } from "./design-group.js";
import { Region } from "./design-region.js";
import { ScreenFrame } from "./design-screen-frame.js";

export interface PagesRegionProps extends Drawing {
	readonly screens: readonly DrawnScreen[];
	readonly size: Size;
	readonly status?: ReactNode;
	readonly aside?: ReactNode;
}

export const PAGES = "Pages";
const STATES_SAID = "{count} states";
const NOTHING_DRAWN = "No pages drawn yet";
const DRAWN_WHEN =
	"The assistant draws every page here at the design step, after Build it is pressed on the spec card. Ask in the chat to start.";

export function PagesRegion({ screens, size, status, aside, registry, host }: PagesRegionProps): ReactElement | null {
	if (screens.length === 0)
		return h(
			Region,
			{ title: PAGES, count: 0, aside },
			h(Empty, null, h(EmptyHeader, null, h(EmptyTitle, null, NOTHING_DRAWN), h(EmptyDescription, null, DRAWN_WHEN))),
		);
	return h(
		Region,
		{ title: PAGES, count: screens.length, aside },
		screens.map((screen) => screenGroupOf(screen, { size, registry, host }, status ?? null)),
	);
}

export function frameLabelOf(screen: DrawnScreen, state: string): string {
	return screen.states.length < 2 || state === screen.name ? screen.name : `${screen.name} · ${state}`;
}

function screenGroupOf(
	screen: DrawnScreen,
	framing: Omit<PagesRegionProps, "screens" | "status" | "aside">,
	status: ReactNode,
): ReactElement {
	return h(
		Group,
		{
			key: screen.name,
			title: screen.name,
			sub: STATES_SAID.replace("{count}", String(screen.states.length)),
			status,
		},
		screen.states.map((state) =>
			h(ScreenFrame, { key: state.name, label: frameLabelOf(screen, state.name), state, ...framing }),
		),
	);
}
