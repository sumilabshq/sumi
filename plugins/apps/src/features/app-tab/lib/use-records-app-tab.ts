import { useEffect } from "react";
import { RecordAppAddressCommand } from "@sumi/contract";
import { useRuntime } from "@widgetarium/data-framework";
import { iconUrlOf } from "./icon-url.js";

interface RecordedFace {
	readonly title: string;
	readonly icon?: string | undefined;
}

const NOT_RECORDED = "[apps] tab {tab}: its title and icon stay as they were ({reason})";

export function useRecordsAppTab({ title, icon }: RecordedFace, tabId: string): void {
	const shell = useRuntime("useRecordsAppTab");
	useEffect(() => {
		const page = icon === undefined ? { id: tabId, title } : { id: tabId, title, favicon: iconUrlOf(icon) };
		void shell.send(RecordAppAddressCommand, page).then((answer) => {
			if (!answer.ok) {
				console.warn(NOT_RECORDED.replace("{tab}", tabId).replace("{reason}", answer.reason));
			}
		});
	}, [shell, tabId, title, icon]);
}
