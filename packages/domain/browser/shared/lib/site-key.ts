export function urlOf(address: string): URL | null {
	try {
		return new URL(address);
	} catch {
		return null;
	}
}

const OPAQUE_ORIGIN = "null";

export function originOf(address: string): string | null {
	const origin = urlOf(address)?.origin;
	return origin === undefined || origin === OPAQUE_ORIGIN ? null : origin;
}
