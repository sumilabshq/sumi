import { createElement as h } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { StudioFrame } from "@widgetarium/shell";
import type { PaneBoardProps } from "@widgetarium/shell";

export interface StudioLayoutProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly shellApp: StartedApp;
	readonly left: ReactNode;
	readonly panes: PaneBoardProps;
	readonly panel: ReactNode;
	readonly right: ReactNode;
}

export function StudioLayout({ frame, shellApp, left, panes, panel, right }: StudioLayoutProps): ReactElement {
	return (
		<AppProvider app={shellApp}>
			<StudioFrame frame={frame} left={left} panes={panes} panel={panel} right={right} />
		</AppProvider>
	);
}
