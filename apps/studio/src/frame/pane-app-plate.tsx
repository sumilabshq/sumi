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
	readonly hostTabs: AppHostParts["hostTabs"];
	readonly browser: BrowserParts;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

const IN_PLATE = { isInPlate: true } as const;
const CLOSED_TAB = "This tab was closed";
const NO_PAGE = "This tab has no page yet";

export function PaneAppPlate({ tabId, hostTabs, browser, design, project }: PaneAppPlateProps): ReactElement {
	const pinned = useSyncExternalStore(
		hostTabs.watch,
		() => hostTabs.now().tabs.find((tab) => tab.id === tabId) ?? null,
	);
	const pageId = pinned?.pageId ?? null;
	const parts = useMemo(() => (pageId === null ? null : paneBrowserParts(browser, pageId)), [browser, pageId]);
	const kind = pinned?.app ?? "browser";
	return (
		<Plate
			side="app"
			label={pinned?.label ?? kind}
			edgeStart={null}
			lead={null}
			crumb={
				<PlateCrumb
					words={{
						first: kind === "browser" ? "Browser" : "Canvas",
						second: pinned?.label ?? null,
					}}
					isPressable={false}
				/>
			}
			more={null}
			edgeEnd={null}
		>
			{paneBodyOf({ isClosed: pinned === null, kind, parts, design, project })}
		</Plate>
	);
}

interface PaneBody {
	readonly isClosed: boolean;
	readonly kind: "browser" | "canvas";
	readonly parts: BrowserParts | null;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

function paneBodyOf({ isClosed, kind, parts, design, project }: PaneBody): ReactElement {
	if (isClosed) {
		return <p className="wg-pane-note">{CLOSED_TAB}</p>;
	}

	if (kind === "canvas") {
		return <StudioCanvas design={design} project={project} shell={IN_PLATE} />;
	}

	return parts === null ? <p className="wg-pane-note">{NO_PAGE}</p> : <BrowserPage parts={parts} />;
}
