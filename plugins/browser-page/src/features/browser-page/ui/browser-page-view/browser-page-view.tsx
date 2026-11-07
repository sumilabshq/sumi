import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { BrowserBody } from "./browser-body.js";
import { useLaysBrowserSheet } from "./use-lays-browser-sheet.js";

const APP_NAME = "Browser";

export function BrowserPageView({ tabId }: AppViewProps): ReactElement {
	const root = useRef<HTMLElement>(null);
	useLaysBrowserSheet(root);
	return (
		<main ref={root} className="wg-browser-app" aria-label={APP_NAME} data-browser-root="">
			<BrowserBody tabId={tabId} />
		</main>
	);
}
