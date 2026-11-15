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

export function renameActionsOf(): readonly RowAction[] {
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
