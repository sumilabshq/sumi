import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { TipSurface } from "../features/canvas/ui/tip-surface/tip-surface.js";
import { TabsColumnShell } from "../features/app-host/ui/tabs-column-shell/tabs-column-shell.js";

const COLUMN = "cv:flex cv:h-full cv:min-h-0";

export function TabsSidebarColumn(): ReactElement {
	const column = useRef<HTMLDivElement | null>(null);
	return (
		<TipSurface>
			<div ref={column} className={COLUMN} data-tabs-sidebar-column="">
				<TabsColumnShell frame={column} />
			</div>
		</TipSurface>
	);
}
