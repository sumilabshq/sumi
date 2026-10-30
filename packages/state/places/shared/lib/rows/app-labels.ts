import type { AppKind } from "../../schema/tabs.schema.js";
import type { HostTab } from "../tabs/host-tabs-moment.js";

export const APP_LABELS: Readonly<Record<AppKind, string>> = {
	canvas: "Canvas",
	browser: "Browser",
	terminal: "Terminal",
	chat: "New chat",
};

export function recordTitleOf(tab: HostTab): string {
	return tab.label ?? tab.title ?? APP_LABELS[tab.app];
}
