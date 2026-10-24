import { createElement as h } from "react";
import type { ReactElement } from "react";
import { HeldTabsQuery } from "@widgetarium/app-host";
import type { HeldTab } from "@widgetarium/app-host";
import { useQuery } from "@widgetarium/core/requests";
import type { StudioBrowser } from "../browser/browser-app.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { Plate } from "../features/plate/ui/plate/plate.js";
import { PlateCrumb } from "../features/plate/ui/plate-header/plate-crumb.js";
import { PlateMore } from "../features/plate/ui/plate-header/plate-more.js";
import type { PlateMoreItem } from "../features/plate/ui/plate-header/plate-more.js";
import { BrowserPage } from "../browser/browser-page.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import { APP_CRUMB_WORD } from "./app-crumb-words.js";

export interface PaneAppPlateProps {
	readonly tabId: string;
	readonly browser: StudioBrowser;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

interface PaneBody {
	readonly browser: StudioBrowser;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

const IN_PLATE = { isInPlate: true } as const;
const NO_TAB = "This tab was closed";
const NO_PAGE = "This tab has no page yet";
// TODO: pane menu items, once app-host commands reach a pane plate
const NO_MORE_ITEMS: readonly PlateMoreItem[] = [];

export function PaneAppPlate({ tabId, browser, design, project }: PaneAppPlateProps): ReactElement {
	const paneTab = useQuery(HeldTabsQuery).data.tabs.find((tab) => tab.id === tabId) ?? null;
	return (
		<Plate
			side="app"
			label={paneLabelOf(paneTab)}
			edgeStart={null}
			lead={null}
			crumb={
				<PlateCrumb
					words={{
						first: paneTab === null ? NO_TAB : APP_CRUMB_WORD[paneTab.app],
						second: paneTab?.label ?? null,
					}}
					isPressable={false}
				/>
			}
			more={<PlateMore items={NO_MORE_ITEMS} />}
			edgeEnd={null}
		>
			{paneBodyOf(paneTab, { browser, design, project })}
		</Plate>
	);
}

function paneLabelOf(paneTab: HeldTab | null): string {
	if (paneTab === null) {
		return NO_TAB;
	}

	return paneTab.label ?? APP_CRUMB_WORD[paneTab.app];
}

function paneBodyOf(paneTab: HeldTab | null, { browser, design, project }: PaneBody): ReactElement {
	if (paneTab === null) {
		return <p className="wg-pane-note">{NO_TAB}</p>;
	}

	if (paneTab.app === "canvas") {
		return <StudioCanvas design={design} project={project} shell={IN_PLATE} />;
	}

	if (paneTab.pageId === null) {
		return <p className="wg-pane-note">{NO_PAGE}</p>;
	}

	return <BrowserPage key={paneTab.pageId} browser={browser} heldTabId={paneTab.pageId} />;
}
