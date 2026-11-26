import { createElement as h } from "react";
import type { ReactElement } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import type { HeldTab } from "@widgetarium/app-host/contract";
import { useQuery } from "@widgetarium/data-framework";
import type { StudioBrowser } from "../browser/browser-app.js";
import { Plate } from "../features/plate/ui/plate/plate.js";
import { PlateCrumb } from "../features/plate/ui/plate-header/plate-crumb.js";
import { PlateMore } from "../features/plate/ui/plate-header/plate-more.js";
import type { PlateMoreItem } from "../features/plate/ui/plate-header/plate-more.js";
import { BrowserPage } from "../browser/browser-page.js";
import { AppPage } from "../features/app-frame/ui/app-page/app-page.js";
import { useAppTitleOf } from "./use-app-title-of.js";

export interface PaneAppPlateProps {
	readonly tabId: string;
	readonly browser: StudioBrowser;
}

const BROWSER_APP = "browser";
const NO_TAB = "This tab was closed";
const NO_PAGE = "This tab has no page yet";
// TODO: pane menu items, once app-host commands reach a pane plate
const NO_MORE_ITEMS: readonly PlateMoreItem[] = [];

export function PaneAppPlate({ tabId, browser }: PaneAppPlateProps): ReactElement {
	const paneTab = useQuery(appHost.tabs.heldTabs).data.tabs.find((tab) => tab.id === tabId) ?? null;
	const appTitleOf = useAppTitleOf();
	const appTitle = paneTab === null ? NO_TAB : appTitleOf(paneTab.app);
	return (
		<Plate
			side="app"
			label={paneTab?.label ?? appTitle}
			edgeStart={null}
			lead={null}
			crumb={
				<PlateCrumb
					words={{
						first: appTitle,
						second: paneTab?.label ?? null,
					}}
				/>
			}
			more={<PlateMore items={NO_MORE_ITEMS} />}
			edgeEnd={null}
		>
			{paneBodyOf(paneTab, browser)}
		</Plate>
	);
}

function paneBodyOf(paneTab: HeldTab | null, browser: StudioBrowser): ReactElement {
	if (paneTab === null) {
		return <p className="wg-pane-note">{NO_TAB}</p>;
	}

	const { id, app, pageId } = paneTab;

	if (app !== BROWSER_APP) {
		return <AppPage key={id} app={app} tabId={id} />;
	}

	if (pageId === null) {
		return <p className="wg-pane-note">{NO_PAGE}</p>;
	}

	return <BrowserPage key={pageId} browser={browser} heldTabId={pageId} />;
}
