import type { KeyboardEvent } from "react";

const MENU_ROW = '[role="menuitem"]:not([disabled])';
const ROW_OF_KEY: ReadonlyMap<string, (rows: readonly HTMLElement[]) => HTMLElement | undefined> = new Map([
	["ArrowDown", (rows: readonly HTMLElement[]) => rows[0]],
	["ArrowUp", (rows: readonly HTMLElement[]) => rows.at(-1)],
]);

export function entersMenuByKey(event: KeyboardEvent<HTMLElement>, panel: HTMLElement | null): void {
	const rowOf = ROW_OF_KEY.get(event.key);

	if (rowOf === undefined || panel === null) {
		return;
	}

	const row = rowOf([...panel.querySelectorAll<HTMLElement>(MENU_ROW)]);

	if (row === undefined) {
		return;
	}

	event.preventDefault();
	row.focus();
}
