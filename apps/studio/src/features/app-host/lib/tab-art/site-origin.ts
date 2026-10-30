const WEB_PROTOCOL = /^https?:$/;

export function webOriginOf(address: string | null): string | null {
	try {
		const url = new URL(address ?? "");
		return WEB_PROTOCOL.test(url.protocol) ? url.origin : null;
	} catch {
		return null;
	}
}
