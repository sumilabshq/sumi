import type { TabStatus } from "@widgetarium/app-host";

export const STATUS_MARK: Readonly<Record<TabStatus, string>> = {
	reading: "cv:absolute cv:inset-0 cv:rounded-full cv:ring-2 cv:ring-brand",
	waiting: "cv:absolute cv:size-2.5 cv:rounded-full cv:bg-[var(--wg-studio-tabs-wait)] cv:ring-2 cv:ring-group",
	"cannot-look": "cv:absolute cv:size-2.5 cv:rounded-full cv:bg-[var(--wg-studio-tabs-faint)] cv:ring-2 cv:ring-group",
};
