import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RAISED_PILL } from "@widgetarium/canvas";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { BrowserTabsQuery, GoBackCommand, GoForwardCommand, ReloadPageCommand } from "../../contract.js";
import { NavSegment } from "./nav-segment.js";

const NAV = `${RAISED_PILL} cv:flex cv:flex-none cv:items-center cv:gap-0.5 cv:p-1`;
const PAGE_MOVES = "Page moves";

export function BrowserNav(): ReactElement {
	const shown = useQuery(BrowserTabsQuery).data.tabs.find((tab) => tab.isShown);
	const goBack = useCommand(GoBackCommand);
	const goForward = useCommand(GoForwardCommand);
	const reload = useCommand(ReloadPageCommand);
	const tabId = shown?.id ?? "";
	const hasPage = shown !== undefined && shown.url !== "";
	return (
		<div role="group" aria-label={PAGE_MOVES} className={NAV} data-browser-nav="">
			<NavSegment label="Back" icon="arrow-left" isOff={!shown?.canGoBack} onPress={() => void goBack.run({ tabId })} />
			<NavSegment
				label="Forward"
				icon="arrow-right"
				isOff={!shown?.canGoForward}
				onPress={() => void goForward.run({ tabId })}
			/>
			<NavSegment label="Reload" icon="rotate-cw" isOff={!hasPage} onPress={() => void reload.run({ tabId })} />
		</div>
	);
}
