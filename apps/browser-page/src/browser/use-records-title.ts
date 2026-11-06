import { useEffect } from "react";
import type { SumiTab } from "../sumi-tab.js";
import { recordIn } from "./use-tab-address.js";

export function useRecordsTitle(tab: SumiTab, title: string): void {
	useEffect(() => {
		recordIn(tab, {
			title,
		});
	}, [tab, title]);
}
