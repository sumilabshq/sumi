import { searchAddressOf } from "../../../shared/lib/search-address.js";

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const LOOKS_LIKE_A_HOST = /^[^\s/]+\.[^\s/]+(\/.*)?$|^localhost(:\d+)?(\/.*)?$/i;

export function webAddressOf(typed: string): string {
	const address = typed.trim();

	if (HAS_SCHEME.test(address) && !LOOKS_LIKE_A_HOST.test(address)) {
		return address;
	}

	if (LOOKS_LIKE_A_HOST.test(address)) {
		return `https://${address}`;
	}

	return searchAddressOf(address);
}

export function isPagesHost(host: unknown): host is HTMLElement {
	return typeof host === "object" && host !== null && "append" in host && "isConnected" in host;
}
