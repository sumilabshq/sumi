import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";
import { TabsColumn } from "../../../features/column/ui/tabs-column/tabs-column.js";
import { ToggleShortcut } from "../../../features/column/ui/toggle-shortcut/toggle-shortcut.js";
import { CloseShortcut } from "../../../features/tabs/ui/close-shortcut/close-shortcut.js";
import { NewTabShortcut } from "../../../features/tabs/ui/new-tab-shortcut/new-tab-shortcut.js";
import { ReopenShortcut } from "../../../features/tabs/ui/reopen-shortcut/reopen-shortcut.js";
import { TabList } from "../../../features/tabs/ui/tab-list/tab-list.js";
import { TabRail } from "../../../features/tabs/ui/tab-rail/tab-rail.js";
import { TabsCount } from "../../../features/tabs/ui/tabs-count/tabs-count.js";
import { ColumnOpenApp } from "../column-open-app/column-open-app.js";
import { RailOpenApp } from "../rail-open-app/rail-open-app.js";

const FRAME =
	"cv:flex cv:h-full cv:w-full cv:flex-row cv:overflow-hidden cv:bg-group cv:[&>aside[data-host-column-side=start]]:order-first";
const APP = "cv:h-full cv:min-w-0 cv:flex-1";

export function AppHostFrame({ children }: { readonly children: ReactNode }): ReactElement {
	const frame = useRef<HTMLDivElement | null>(null);
	return (
		<div ref={frame} className={FRAME} data-app-host-frame="">
			<div className={APP}>{children}</div>
			<Slot loading={null}>
				<TabsColumn
					title={<TabsCount />}
					icons={<TabRail tipSide="left" openApp={<RailOpenApp />} />}
					full={<TabList openApp={<ColumnOpenApp />} />}
				/>
				<CloseShortcut frame={frame} />
				<ToggleShortcut frame={frame} />
				<NewTabShortcut frame={frame} />
				<ReopenShortcut frame={frame} />
			</Slot>
		</div>
	);
}
