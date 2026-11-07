export function siteOf(url: string): string {
	try {
		return new URL(url).host.replace(/^www\./, "") || url;
	} catch {
		return url;
	}
}
