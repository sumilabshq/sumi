import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { RegisteredApp } from "@widgetarium/app-registry";
import { useAppPageUrlOf } from "../../lib/app-page-url-context.js";
import { FrameWindow } from "./frame-window.js";

export interface AppFrameProps {
	readonly registered: RegisteredApp;
	readonly tabId: string;
}

export function AppFrame({ registered, tabId }: AppFrameProps): ReactElement {
	const pageUrlOf = useAppPageUrlOf();
	return <FrameWindow app={registered.id} url={pageUrlOf(registered)} tabId={tabId} />;
}
