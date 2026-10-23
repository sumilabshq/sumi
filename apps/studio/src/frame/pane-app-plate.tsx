import { createElement as h, useMemo, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import type { AppHostParts } from "@widgetarium/app-host/gateways";
import { paneBrowserParts } from "@widgetarium/browser/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { Plate, PlateCrumb } from "@widgetarium/shell";
import { BrowserPage } from "../browser/browser-page.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";

export interface PaneAppPlateProps {
	readonly tabId: string;
	readonly appHost: AppHostParts;
	readonly browser: BrowserParts;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

type PaneTab = ReturnType<AppHostParts["hostTabs"]["now"]>["tabs"][number];

const IN_PLATE = { isInPlate: true } as const;
const NO_TAB = "This tab was closed";
const NO_PAGE = "This tab has no page yet";
const CRUMB_OF_APP = {
	browser: "Browser",
	canvas: "Canvas",
} as const;

export function PaneAppPlate({ tabId, appHost, browser, design, project }: PaneAppPlateProps): ReactElement {
	const { hostTabs } = appHost;
	const paneTab = useSyncExternalStore(
		hostTabs.watch,
		() => hostTabs.now().tabs.find((tab) => tab.id === tabId) ?? null,
	);
	const pageId = paneTab === null ? null : appHost.tabPageIdOf(paneTab.id);
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
						first: paneTab === null ? NO_TAB : CRUMB_OF_APP[paneTab.app],
						second: paneTab?.label ?? null,
					}}
					isPressable={false}
				/>
			}
			more={null}
			edgeEnd={null}
		>
			{paneBodyOf(paneTab, { parts, design, project })}
		</Plate>
	);
}

interface PaneBodyParts {
	readonly parts: BrowserParts | null;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

function paneBodyOf(paneTab: PaneTab | null, { parts, design, project }: PaneBodyParts): ReactElement {
	if (paneTab === null) {
		return <p className="wg-pane-note">{NO_TAB}</p>;
	}

	if (paneTab.app === "canvas") {
		return <StudioCanvas design={design} project={project} shell={IN_PLATE} />;
	}

	return parts === null ? <p className="wg-pane-note">{NO_PAGE}</p> : <BrowserPage parts={parts} />;
}
