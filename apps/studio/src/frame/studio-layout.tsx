import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { ShellAppProvider, StudioFrame } from "@widgetarium/shell";
import type { PaneBoardProps } from "@widgetarium/shell";

export interface StudioLayoutProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly shellApp: StartedApp;
	readonly studio: StudioHostPort;
	readonly left: ReactNode;
	readonly panes: PaneBoardProps;
	readonly panel: ReactNode;
	readonly right: ReactNode;
}

export function StudioLayout({ frame, shellApp, studio, left, panes, panel, right }: StudioLayoutProps): ReactElement {
	const chromeLeftPx = useSyncExternalStore(studio.onInsets, () => studio.insets().left);
	return (
		<ShellAppProvider app={shellApp}>
			<StudioFrame frame={frame} chromeLeftPx={chromeLeftPx} left={left} panes={panes} panel={panel} right={right} />
		</ShellAppProvider>
	);
}
