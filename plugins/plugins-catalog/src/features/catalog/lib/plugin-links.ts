export function sourceLinkOf(source: string | null): string | null {
	return source;
}

export function reportLinkOf(source: string | null): string | null {
	return source === null ? null : `${source.replace(/\/$/, "")}/issues`;
}
