import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import { RecordAppPageCommand, catchLinks, wearSumiTheme } from "@sumi/contract";
import { TaskRefSchema } from "@widgetarium/tasks";
import { AppProvider } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import { BOARD_ADDRESS } from "./features/tasks/lib/use-open-task.js";
import { HeaderActionsContext, useStartsHeaderActions } from "./sumi/header-actions.js";
import type { SumiFrame } from "./sumi/sumi-frame.js";
import { SumiTabContext, useTabOf } from "./sumi/sumi-tab.js";
import { TasksPage } from "./tasks/tasks-page.js";

const APP_NAME = "Tasks";
const FAVICON = "favicon.svg";
const SUMI_APP_PROTOCOL = "sumi-app:";

interface TasksRootProps {
	readonly frame: SumiFrame;
}

interface RecordedPage {
	readonly id: string;
	readonly title?: string;
	readonly favicon?: string;
}

export function TasksRoot({ frame }: TasksRootProps): ReactElement | null {
	const tab = useTabOf(frame);
	const headerActions = useStartsHeaderActions(frame);
	useWearsSumi(frame);
	useRecordsFavicon(frame);
	useRecordsTitle(frame, tab.address);

	if (tab.address === null) {
		return null;
	}

	const shown = shownAddressOf(tab.address);
	return (
		<SumiTabContext.Provider value={tab}>
			<HeaderActionsContext.Provider value={headerActions}>
				<AppProvider app={frame.sumi}>
					<main className="wg-tasks-app wg-app-body" aria-label={APP_NAME}>
						<TasksPage key={shown} address={shown} />
					</main>
				</AppProvider>
			</HeaderActionsContext.Provider>
		</SumiTabContext.Provider>
	);
}

function useWearsSumi(frame: SumiFrame): void {
	useEffect(() => wearSumiTheme(frame), [frame]);
	useEffect(() => catchLinks(frame), [frame]);
}

function shownAddressOf(address: string): string {
	return TaskRefSchema.safeParse(address).success ? address : BOARD_ADDRESS;
}

function useRecordsFavicon({ sumi, tabId }: SumiFrame): void {
	useEffect(() => {
		if (location.protocol !== SUMI_APP_PROTOCOL) {
			return;
		}

		recordPage(sumi, {
			id: tabId,
			favicon: new URL(FAVICON, location.href).href,
		});
	}, [sumi, tabId]);
}

function useRecordsTitle({ sumi, tabId }: SumiFrame, address: string | null): void {
	useEffect(() => {
		if (address === null) {
			return;
		}

		recordPage(sumi, {
			id: tabId,
			title: address === BOARD_ADDRESS ? APP_NAME : address,
		});
	}, [sumi, tabId, address]);
}

function recordPage(sumi: StartedApp, page: RecordedPage): void {
	void sumi.send(RecordAppPageCommand, page).then((recorded) => {
		if (!recorded.ok) {
			console.error(`[tasks] recording the tab page was refused: ${recorded.reason}`);
		}
	});
}
