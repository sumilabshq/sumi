export function urlOf(address: string): URL | null {
	try {
		return new URL(address);
	} catch {
		return null;
	}
}
