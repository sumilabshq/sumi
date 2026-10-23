import { createElement as h, useRef, useState } from "react";
import type { ReactElement } from "react";
import { TabsColumnShell } from "@widgetarium/app-host";
import { AppHostClientModule } from "@widgetarium/app-host/module";
import type { AppHostParts } from "@widgetarium/app-host/gateways";
import { TipSurface } from "@widgetarium/canvas";
import { AppProvider, app } from "@widgetarium/core/requests";

const COLUMN = "cv:flex cv:h-full cv:min-h-0";

export function TabsSidebarColumn({ hostParts }: { readonly hostParts: AppHostParts }): ReactElement {
	const [hostApp] = useState(() => app({ modules: [AppHostClientModule.with(hostParts)] }));
	const column = useRef<HTMLDivElement | null>(null);
	return (
		<AppProvider app={hostApp}>
			<TipSurface>
				<div ref={column} className={COLUMN} data-tabs-sidebar-column="">
					<TabsColumnShell frame={column} />
				</div>
			</TipSurface>
		</AppProvider>
	);
}
