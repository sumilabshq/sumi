export function siteLetterOf(title: string, address: string | null): string {
	const host = hostOf(address ?? "")?.replace(/^www\./, "") ?? title;
	return (host.trim()[0] ?? "?").toUpperCase();
}

function hostOf(url: string): string | null {
	try {
		return new URL(url).host || null;
	} catch {
		return null;
	}
}
