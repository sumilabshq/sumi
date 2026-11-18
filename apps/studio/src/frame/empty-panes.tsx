import { createElement as h } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Button } from "@widgetarium/kit";

const OPEN_CHAT = "Open chat";
const OPEN_TAB = "Open tab";

export function EmptyPanes(): ReactElement {
	const placePane = useCommand(appHost.panes.place);
	return (
		<div className="wg-pane-empty-actions" data-pane-empty="">
			<Button
				variant="ghost"
				onClick={() => void placePane.run({ view: { kind: "chat" }, targetId: null, side: "right" })}
				data-pane-open="chat"
			>
				{OPEN_CHAT}
			</Button>
			<Button
				variant="ghost"
				onClick={() =>
					void placePane.run({
						view: {
							kind: "app",
							tabId: null,
						},
						targetId: null,
						side: "right",
					})
				}
				data-pane-open="app"
			>
				{OPEN_TAB}
			</Button>
		</div>
	);
}
