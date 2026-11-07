import { useEffect } from "react";
import { RecordAppPageCommand } from "@sumi/contract";
import { useRuntime } from "@widgetarium/data-framework";
import { iconUrlOf } from "./icon-url.js";

interface RecordedFace {
	readonly title: string;
	readonly icon: string;
}

const NOT_RECORDED = "[apps] tab {tab}: its title and icon stay as they were ({reason})";

export function useRecordsAppTab({ title, icon }: RecordedFace, tabId: string): void {
	const shell = useRuntime("useRecordsAppTab");
	useEffect(() => {
		void shell.send(RecordAppPageCommand, { id: tabId, title, favicon: iconUrlOf(icon) }).then((answer) => {
			if (!answer.ok) {
				console.warn(NOT_RECORDED.replace("{tab}", tabId).replace("{reason}", answer.reason));
			}
		});
	}, [shell, tabId, title, icon]);
}
