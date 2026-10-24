import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Browser } from "@widgetarium/browser";
import { TipSurface } from "@widgetarium/canvas";
import { BrowserClientModule } from "@widgetarium/browser/module";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import { AppProvider, OnRefused, app, toastRefusal } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { Toaster } from "@widgetarium/kit";
import { BrowserPlateHeader } from "./browser-plate-header.js";

export interface BrowserPageProps {
	readonly parts: BrowserParts;
}

const STAGE = "wg-root cv:h-full cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";

export function BrowserPage({ parts }: BrowserPageProps): ReactElement {
	const [browserApp] = useState(() => createBrowserApp(parts));
	return (
		<div className={STAGE} data-browser-studio="">
			<AppProvider app={browserApp}>
				<OnRefused value={toastRefusal}>
					<Toaster />
					<TipSurface>
						<Browser header={<BrowserPlateHeader />} />
					</TipSurface>
				</OnRefused>
			</AppProvider>
		</div>
	);
}

function createBrowserApp(parts: BrowserParts): StartedApp {
	return app().modules(BrowserClientModule.with(parts)).start();
}
