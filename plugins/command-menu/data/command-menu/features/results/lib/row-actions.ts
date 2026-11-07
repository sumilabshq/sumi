import type { Intent, RowAction } from "../../../shared/schema/command-menu.schema.js";

const RENAME: RowAction = {
	label: "Rename",
	shortcut: "⌘R",
	isDanger: false,
	intent: null,
	isRename: true,
};

export function tabActionsOf(id: string, title: string): readonly RowAction[] {
	return [
		RENAME,
		{
			label: "Close tab",
			shortcut: "⌘W",
			isDanger: true,
			intent: {
				do: "close-tab",
				id,
				title,
			},
			isRename: false,
		},
	];
}

export function chatActionsOf(id: string, isPinned: boolean): readonly RowAction[] {
	return [
		RENAME,
		{
			label: isPinned ? "Unpin" : "Pin",
			shortcut: null,
			isDanger: false,
			intent: {
				do: "pin-chat",
				id,
				isPinned: !isPinned,
			},
			isRename: false,
		},
	];
}

export function workspaceActionsOf(): readonly RowAction[] {
	return [RENAME];
}

export function openActionsOf(intent: Intent): readonly RowAction[] {
	return [
		{
			label: "Open in a new tab",
			shortcut: "⇧↵",
			isDanger: false,
			intent,
			isRename: false,
		},
	];
}
