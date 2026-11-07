import { useCallback } from "react";
import { PlaceWebPageCommand } from "@sumi/contract";
import type { PageArea } from "@sumi/contract";
import { useApp } from "@widgetarium/data-framework";

const PLACE_REFUSED = "[browser-page] tab {tab}: the page area was not placed ({reason})";

export function useSendsPageArea(tabId: string): (area: PageArea | null) => void {
	const shell = useApp("useSendsPageArea");
	return useCallback(
		(area: PageArea | null): void => {
			void shell.send(PlaceWebPageCommand, { tab: tabId, area }).then((answer) => {
				if (!answer.ok) {
					console.error(PLACE_REFUSED.replace("{tab}", tabId).replace("{reason}", answer.reason));
				}
			});
		},
		[shell, tabId],
	);
}
