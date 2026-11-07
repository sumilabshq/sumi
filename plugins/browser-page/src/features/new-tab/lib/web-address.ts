import { searchAddressOf } from "./search-address.js";

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const LOOKS_LIKE_A_HOST = /^[^\s/]+\.[^\s/]+(\/.*)?$|^localhost(:\d+)?(\/.*)?$/i;

export function webAddressOf(typed: string): string {
	const address = typed.trim();

	if (LOOKS_LIKE_A_HOST.test(address)) {
		return `https://${address}`;
	}

	if (HAS_SCHEME.test(address)) {
		return address;
	}

	return searchAddressOf(address);
}
