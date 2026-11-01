const WEB_SCHEMES: ReadonlySet<string> = new Set(["http:", "https:"]);

export function refuseWebUrl(url: string): string | null {
	if (!URL.canParse(url)) {
		return `${url} is not a url`;
	}

	const { protocol } = new URL(url);
	return WEB_SCHEMES.has(protocol) ? null : `${protocol} is not a web scheme: a web page opens only http and https`;
}

export function urlWithoutFragment(url: string): string {
	if (!URL.canParse(url)) {
		return url;
	}

	const parsed = new URL(url);
	parsed.hash = "";
	return parsed.toString();
}
