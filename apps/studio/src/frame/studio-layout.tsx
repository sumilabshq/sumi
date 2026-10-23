import { createElement as h } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { StudioFrame } from "@widgetarium/shell";

export interface StudioLayoutProps {
	readonly frame: RefObject<HTMLDivElement | null>;
	readonly shellApp: StartedApp;
	readonly left: ReactNode;
	readonly chat: ReactNode;
	readonly app: ReactNode;
	readonly panel: ReactNode;
	readonly right: ReactNode;
}

export function StudioLayout({ frame, shellApp, left, chat, app, panel, right }: StudioLayoutProps): ReactElement {
	return (
		<AppProvider app={shellApp}>
			<StudioFrame frame={frame} left={left} chat={chat} app={app} panel={panel} right={right} />
		</AppProvider>
	);
}
