import type { FlowIcon } from "@widgetarium/navigation/contract";

export const FLOW_ICON_CHOICES: readonly string[] = [
	"folder",
	"globe",
	"star",
	"book-open",
	"file-text",
	"square-terminal",
	"git-branch",
	"layout-template",
	"list",
	"message-square",
];

export function iconChoiceOf(name: string): FlowIcon {
	return { kind: "icon", name };
}
