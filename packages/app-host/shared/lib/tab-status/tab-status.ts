import type { TabStatus } from "../../schema/app-tab.schema.js";

export const STATUS_SAID: Readonly<Record<TabStatus, string>> = {
	reading: "Ink is reading",
	waiting: "Waiting for you",
	"cannot-look": "Ink can't look here",
};

export const STATUS_TONE: Readonly<Record<TabStatus, string>> = {
	reading: "cv:text-brand",
	waiting: "cv:text-[var(--wg-studio-tabs-wait)]",
	"cannot-look": "cv:text-muted-foreground",
};

export const STATUS_MARK: Readonly<Record<TabStatus, string>> = {
	reading: "cv:absolute cv:inset-0 cv:rounded-full cv:ring-2 cv:ring-brand",
	waiting: "cv:absolute cv:size-2.5 cv:rounded-full cv:bg-[var(--wg-studio-tabs-wait)] cv:ring-2 cv:ring-group",
	"cannot-look": "cv:absolute cv:size-2.5 cv:rounded-full cv:bg-[var(--wg-studio-tabs-faint)] cv:ring-2 cv:ring-group",
};
