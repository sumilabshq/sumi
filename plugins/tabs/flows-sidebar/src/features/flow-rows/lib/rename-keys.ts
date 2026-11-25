import type { KeyboardEvent } from "react";

export const RENAME_KEY = "F2";

export const FOLDER_RENAME_KEYS: readonly string[] = ["Enter", RENAME_KEY];

export const FLOW_RENAME_KEYS: readonly string[] = [RENAME_KEY];

export function renamesOn(keys: readonly string[], rename: () => void): (event: KeyboardEvent<HTMLElement>) => void {
	return (event) => {
		if (!keys.includes(event.key)) {
			return;
		}

		event.preventDefault();
		rename();
	};
}
