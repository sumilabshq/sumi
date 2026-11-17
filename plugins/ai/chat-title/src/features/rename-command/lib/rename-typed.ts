const RENAME_TYPED = /^\s*\/rename(?:\s+([\s\S]*))?$/i;

export interface RenameTyped {
	readonly title: string | null;
}

export function renameTypedIn(draft: string): RenameTyped | null {
	const found = RENAME_TYPED.exec(draft);

	if (found === null) {
		return null;
	}

	const title = (found[1] ?? "").trim();
	return { title: title === "" ? null : title };
}
