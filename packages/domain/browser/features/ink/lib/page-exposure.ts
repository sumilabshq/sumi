import { SECRET_FIELD_ON_PAGE } from "./read-refusals.js";
import { SENSITIVE_SITES } from "../../../shared/lib/sensitive-sites.js";
import { isOnList, siteKeyOfAddress } from "../../../shared/lib/decide-browser-access.js";
import { urlOf } from "../../../shared/lib/site-key.js";

export interface FramesShown {
	readonly pageUrl: string;
	readonly frames: readonly string[];
	readonly isAllowed: (url: string) => boolean;
}

export const UNSEEN_PAGES: ReadonlySet<string> = new Set(["", "about:blank", "about:srcdoc"]);

export function refuseClosedFrame({ pageUrl, frames, isAllowed }: FramesShown): string | null {
	const pageOrigin = urlOf(pageUrl)?.origin;
	const closedFrame = frames
		.filter((url) => url !== pageUrl && !UNSEEN_PAGES.has(url))
		.find((url) => !isAllowed(url) || isForeignFrame(url, pageOrigin));

	return closedFrame === undefined ? null : `frame-not-allowed:${siteKeyOfAddress(closedFrame)}`;
}

export function refusePaymentFrame(frames: readonly string[]): string | null {
	const paying = frames.some((url) => isOnList(siteKeyOfAddress(url), SENSITIVE_SITES.paymentFrames));

	return paying ? SECRET_FIELD_ON_PAGE : null;
}

function isForeignFrame(url: string, pageOrigin: string | undefined): boolean {
	return urlOf(url)?.origin !== pageOrigin && !isOnList(siteKeyOfAddress(url), SENSITIVE_SITES.framesAllowed);
}
