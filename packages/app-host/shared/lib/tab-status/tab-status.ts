import type { TabStatus } from "../../schema/app-tab.schema.js";

export const STATUS_SAID: Readonly<Record<TabStatus, string>> = {
	reading: "Ink is reading",
	waiting: "Waiting for you",
	"cannot-look": "Ink can't look here",
};

export const STATUS_TONE: Readonly<Record<TabStatus, string>> = {
	reading: "cv:text-info",
	waiting: "cv:text-warning",
	"cannot-look": "cv:text-muted-foreground",
};

export const STATUS_MARK: Readonly<Record<TabStatus, string>> = {
	reading: "cv:absolute cv:inset-0 cv:rounded-full cv:ring-2 cv:ring-info",
	waiting: "cv:absolute cv:top-0 cv:right-0 cv:size-2.5 cv:rounded-full cv:bg-warning cv:ring-2 cv:ring-group",
	"cannot-look":
		"cv:absolute cv:top-0 cv:right-0 cv:size-2.5 cv:rounded-full cv:bg-muted-foreground cv:ring-2 cv:ring-group",
};
