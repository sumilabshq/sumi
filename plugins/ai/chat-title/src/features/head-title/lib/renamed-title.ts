export function renamedTitleOf(draft: string, was: string): string | null {
	const title = draft.trim();
	return title === "" || title === was ? null : title;
}
