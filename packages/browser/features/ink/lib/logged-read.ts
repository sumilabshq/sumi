import { siteKeyOfAddress } from "../../../shared/lib/decide-browser-access.js";
import { urlOf } from "../../../shared/lib/site-key.js";
import type { ReadKind } from "../../../shared/schema/site-access.schema.js";

export interface Logged {
	readonly tab: string;
	readonly siteKey: string;
	readonly kind: ReadKind;
	readonly finalUrl: string;
}

const WEB_PROTOCOL = /^https?:$/;

export function loggedOf(tabId: string | null, kind: ReadKind, address: string): Logged {
	return {
		tab: tabId ?? "",
		siteKey: siteKeyOfAddress(address),
		kind,
		finalUrl: address,
	};
}

export function loggedAddressOf(address: string): string {
	const url = urlOf(address);

	if (url === null) {
		return "";
	}

	if (!WEB_PROTOCOL.test(url.protocol)) {
		return url.protocol;
	}

	return `${url.origin}${url.pathname}`;
}
