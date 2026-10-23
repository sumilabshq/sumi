import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { AppHostBar, AppHostFrame } from "@widgetarium/app-host";
import { AppHostClientModule } from "@widgetarium/app-host/module";
import { Browser, BrowserAppZone } from "@widgetarium/browser";
import { TipSurface } from "@widgetarium/canvas";
import { BrowserClientModule } from "@widgetarium/browser/module";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import { AppProvider, OnRefused, app, toastRefusal } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { Toaster } from "@widgetarium/kit";
import type { CanvasShell } from "../canvas/canvas-page.js";

export interface BrowserPageProps {
	readonly parts: BrowserParts;
	readonly shell: CanvasShell;
}

const STAGE = "wg-root cv:h-full cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";

export function BrowserPage({ parts, shell }: BrowserPageProps): ReactElement {
	const [browserApp] = useState(() => createBrowserApp(parts, shell));
	return (
		<div className={STAGE} data-browser-studio="">
			<AppProvider app={browserApp}>
				<OnRefused value={toastRefusal}>
					<Toaster />
					<TipSurface>
						<AppHostFrame>
							<Browser header={<AppHostBar appZone={<BrowserAppZone />} cornerEnd={shell.cornerEnd} />} />
						</AppHostFrame>
					</TipSurface>
				</OnRefused>
			</AppProvider>
		</div>
	);
}

function createBrowserApp(parts: BrowserParts, shell: CanvasShell): StartedApp {
	return app({ modules: [BrowserClientModule.with(parts), AppHostClientModule.with(shell.hostParts)] });
}
