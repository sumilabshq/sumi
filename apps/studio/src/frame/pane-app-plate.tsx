import { createElement as h, useMemo, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import type { AppHostParts } from "@widgetarium/app-host/gateways";
import { paneBrowserParts } from "@widgetarium/browser/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { Plate, PlateCrumb, PlateMore } from "@widgetarium/shell";
import type { PlateMoreItem } from "@widgetarium/shell";
import { BrowserPage } from "../browser/browser-page.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import { APP_CRUMB_WORD } from "./app-crumb-words.js";

export interface PaneAppPlateProps {
	readonly tabId: string;
	readonly appHost: AppHostParts;
	readonly browser: BrowserParts;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

type PaneTab = ReturnType<AppHostParts["hostTabs"]["now"]>["tabs"][number];

interface PaneBody {
	readonly pageId: string | null;
	readonly parts: BrowserParts | null;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

const IN_PLATE = { isInPlate: true } as const;
const NO_TAB = "This tab was closed";
const NO_PAGE = "This tab has no page yet";
// TODO: pane menu items, once app-host commands reach a pane plate
const NO_MORE_ITEMS: readonly PlateMoreItem[] = [];

export function PaneAppPlate({ tabId, appHost, browser, design, project }: PaneAppPlateProps): ReactElement {
	const { hostTabs } = appHost;
	const paneTab = useSyncExternalStore(
		hostTabs.watch,
		() => hostTabs.now().tabs.find((tab) => tab.id === tabId) ?? null,
	);
	const pageId = usePaneTabPageId(appHost, tabId);
	const parts = useMemo(() => (pageId === null ? null : paneBrowserParts(browser, pageId)), [browser, pageId]);
	return (
		<Plate
			side="app"
			label={paneTab?.label ?? NO_TAB}
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
			{paneBodyOf(paneTab, { pageId, parts, design, project })}
		</Plate>
	);
}

function usePaneTabPageId(appHost: AppHostParts, tabId: string): string | null {
	const watchTabPages = useMemo(() => tabPagesWatchOf(appHost), [appHost]);
	return useSyncExternalStore(watchTabPages, () => appHost.tabPageIdOf(tabId));
}

function tabPagesWatchOf({ hostTabs, pageFactsGateway }: AppHostParts): (changed: () => void) => () => void {
	return (changed) => {
		const stops = [hostTabs.watch(changed), pageFactsGateway.watch(changed)];
		return () => stops.forEach((stop) => stop());
	};
}

function paneBodyOf(paneTab: PaneTab | null, { pageId, parts, design, project }: PaneBody): ReactElement {
	if (paneTab === null) {
		return <p className="wg-pane-note">{NO_TAB}</p>;
	}

	if (paneTab.app === "canvas") {
		return <StudioCanvas design={design} project={project} shell={IN_PLATE} />;
	}

	if (parts === null) {
		return <p className="wg-pane-note">{NO_PAGE}</p>;
	}

	return <BrowserPage key={pageId} parts={parts} />;
}
