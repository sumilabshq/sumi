import { createElement as h, useSyncExternalStore } from "react";
import type { ComponentType, ReactElement, ReactNode, RefObject } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { AppProvider } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import type { AppPageUrlOf } from "@widgetarium/app-registry";
import type { DrawnTabPage, WindowOffers, WindowProviderProps } from "@sumi/sumi-host-plugin";
import type { WindowLayer } from "../plugins/sumi-plugins.js";
import type { FrameRoutesFor } from "../features/app-frame/lib/frame-relay.js";
import { StudioFrame } from "../features/frame/ui/studio-frame/studio-frame.js";
import { WindowLayersContext } from "../features/frame/lib/window-layers-context.js";
import { AppFramesProvider } from "../features/app-frame/ui/app-frames/app-frames-provider.js";
import { WindowOffersContext } from "../features/app-frame/lib/window-offers-context.js";
import { WindowProviders } from "./window-providers.js";
import type { PaneBoardProps } from "../features/panes/ui/pane-board/pane-board.js";

export interface StudioLayoutProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly layoutApp: StartedApp;
	readonly frameRoutes: FrameRoutesFor;
	readonly appPageUrlOf: AppPageUrlOf;
	readonly tabPages: readonly DrawnTabPage[];
	readonly windowOffers: WindowOffers;
	readonly windowProviders: readonly ComponentType<WindowProviderProps>[];
	readonly windowLayers: readonly WindowLayer[];
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
	tabPages,
	windowOffers,
	windowProviders,
	windowLayers,
	studio,
	left,
	panes,
	panel,
}: StudioLayoutProps): ReactElement {
	const chromeLeftPx = useSyncExternalStore(studio.onInsets, () => studio.insets().left);
	return (
		<AppProvider app={layoutApp}>
			<WindowOffersContext value={windowOffers}>
				<AppFramesProvider routesFor={frameRoutes} pageUrlOf={appPageUrlOf} tabPages={tabPages}>
					<WindowLayersContext value={windowLayers}>
						<WindowProviders providers={windowProviders}>
							<StudioFrame
								frame={frame}
								chromeLeftPx={chromeLeftPx}
								readCursor={studio.cursorInWindow}
								left={left}
								panes={panes}
								panel={panel}
							/>
						</WindowProviders>
					</WindowLayersContext>
				</AppFramesProvider>
			</WindowOffersContext>
		</AppProvider>
	);
}
