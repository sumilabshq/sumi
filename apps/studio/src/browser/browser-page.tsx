import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TipSurface } from "../features/canvas/ui/tip-surface/tip-surface.js";
import { AppProvider, OnRefused, toastRefusal } from "@widgetarium/core/requests";
import { Toaster } from "@widgetarium/kit";
import { HeldTabContext } from "../features/browser/lib/held-tab.js";
import { Browser } from "../features/browser/ui/browser/browser.js";
import type { StudioBrowser } from "./browser-app.js";
import { BrowserPlateHeader } from "./browser-plate-header.js";

export interface BrowserPageProps {
	readonly browser: StudioBrowser;
	readonly heldTabId: string | null;
}

const STAGE = "wg-root cv:h-full cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";

export function BrowserPage({ browser, heldTabId }: BrowserPageProps): ReactElement {
	return (
		<div className={STAGE} data-browser-studio="">
			<AppProvider app={browser.browserApp}>
				<HeldTabContext value={heldTabId}>
					<OnRefused value={toastRefusal}>
						<Toaster />
						<TipSurface>
							<Browser header={<BrowserPlateHeader />} />
						</TipSurface>
					</OnRefused>
				</HeldTabContext>
			</AppProvider>
		</div>
	);
}
