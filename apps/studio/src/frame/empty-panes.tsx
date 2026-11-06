import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/framework";
import { Button } from "@widgetarium/kit";
import { PlacePaneCommand } from "@widgetarium/layout";

const OPEN_CHAT = "Open chat";
const OPEN_TAB = "Open tab";

export function EmptyPanes(): ReactElement {
	const placePane = useCommand(PlacePaneCommand);
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
