import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { StudioFrame } from "../features/frame/ui/studio-frame/studio-frame.js";
import type { PaneBoardProps } from "../features/panes/ui/pane-board/pane-board.js";

export interface StudioLayoutProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly layoutApp: StartedApp;
	readonly studio: StudioHostPort;
	readonly left: ReactNode;
	readonly panes: PaneBoardProps;
	readonly panel: ReactNode;
}

export function StudioLayout({ frame, layoutApp, studio, left, panes, panel }: StudioLayoutProps): ReactElement {
	const chromeLeftPx = useSyncExternalStore(studio.onInsets, () => studio.insets().left);
	return (
		<AppProvider app={layoutApp}>
			<StudioFrame frame={frame} chromeLeftPx={chromeLeftPx} left={left} panes={panes} panel={panel} />
		</AppProvider>
	);
}
