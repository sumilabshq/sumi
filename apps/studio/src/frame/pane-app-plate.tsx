import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AppFacesQuery, HeldTabsQuery } from "@widgetarium/app-host";
import type { AppFace, HeldTab } from "@widgetarium/app-host";
import { useQuery } from "@widgetarium/core/requests";
import type { StudioBrowser } from "../browser/browser-app.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { Plate } from "../features/plate/ui/plate/plate.js";
import { PlateCrumb } from "../features/plate/ui/plate-header/plate-crumb.js";
import { PlateMore } from "../features/plate/ui/plate-header/plate-more.js";
import type { PlateMoreItem } from "../features/plate/ui/plate-header/plate-more.js";
import { BrowserPage } from "../browser/browser-page.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import { TerminalPage } from "../terminal/terminal-page.js";
import { TasksPage } from "../tasks/tasks-page.js";
import { InstalledAppPage } from "../features/app-frame/ui/installed-app-page/installed-app-page.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import { appPageOf } from "./app-page-of.js";
import { useAppTitleOf } from "./use-app-title-of.js";

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
	readonly faces: readonly AppFace[];
}

const IN_PLATE = { isInPlate: true } as const;
const NO_TAB = "This tab was closed";
const NO_PAGE = "This tab has no page yet";
// TODO: pane menu items, once app-host commands reach a pane plate
const NO_MORE_ITEMS: readonly PlateMoreItem[] = [];

export function PaneAppPlate({ tabId, browser, design, project }: PaneAppPlateProps): ReactElement {
	const paneTab = useQuery(HeldTabsQuery).data.tabs.find((tab) => tab.id === tabId) ?? null;
	const appTitleOf = useAppTitleOf();
	const { faces } = useQuery(AppFacesQuery).data;
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
					isPressable={false}
				/>
			}
			more={<PlateMore items={NO_MORE_ITEMS} />}
			edgeEnd={null}
		>
			{paneBodyOf(paneTab, { browser, design, project, faces })}
		</Plate>
	);
}

function paneBodyOf(paneTab: HeldTab | null, { browser, design, project, faces }: PaneBody): ReactElement {
	if (paneTab === null) {
		return <p className="wg-pane-note">{NO_TAB}</p>;
	}

	const { id, app, address, pageId } = paneTab;
	return appPageOf({
		app,
		faces,
		builtIn: {
			canvas: () => <StudioCanvas design={design} project={project} shell={IN_PLATE} />,
			terminal: () => <TerminalPage key={id} />,
			tasks: () => <TasksPage key={id} address={address ?? ""} />,
			browser: () =>
				pageId === null ? (
					<p className="wg-pane-note">{NO_PAGE}</p>
				) : (
					<BrowserPage key={pageId} browser={browser} heldTabId={pageId} />
				),
		},
		installed: () => <InstalledAppPage key={id} app={app} tabId={id} isShown />,
	});
}
