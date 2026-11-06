import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { AppProvider } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import type { AppPageUrlOf } from "@widgetarium/app-registry";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import type { FrameRoutesFor } from "../features/app-frame/lib/frame-relay.js";
import { StudioFrame } from "../features/frame/ui/studio-frame/studio-frame.js";
import { AppFramesProvider } from "../features/app-frame/ui/app-frames/app-frames-provider.js";
import type { PaneBoardProps } from "../features/panes/ui/pane-board/pane-board.js";

export interface StudioLayoutProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly layoutApp: StartedApp;
	readonly frameRoutes: FrameRoutesFor;
	readonly appPageUrlOf: AppPageUrlOf;
	readonly tabPage: DrawnTabPage | null;
	readonly studio: StudioHostPort;
	readonly left: ReactNode;
	readonly panes: PaneBoardProps;
	readonly panel: ReactNode;
}

export function StudioLayout({
	frame,
	layoutApp,
	frameRoutes,
	appPageUrlOf,
	tabPage,
	studio,
	left,
	panes,
	panel,
}: StudioLayoutProps): ReactElement {
	const chromeLeftPx = useSyncExternalStore(studio.onInsets, () => studio.insets().left);
	return (
		<AppProvider app={layoutApp}>
			<AppFramesProvider routesFor={frameRoutes} pageUrlOf={appPageUrlOf} tabPage={tabPage}>
				<StudioFrame
					frame={frame}
					chromeLeftPx={chromeLeftPx}
					readCursor={studio.cursorInWindow}
					left={left}
					panes={panes}
					panel={panel}
				/>
			</AppFramesProvider>
		</AppProvider>
	);
}
