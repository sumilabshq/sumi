import type { LoadFailureKind } from "../schema/browser-tab.schema.js";

const ABORTED = -3;
const CERTIFICATE_FIRST = -299;
const CERTIFICATE_LAST = -200;

const KIND_OF_CODE: ReadonlyMap<number, LoadFailureKind> = new Map<number, LoadFailureKind>([
	[-105, "not-found"],
	[-137, "not-found"],
	[-106, "offline"],
	[-100, "refused"],
	[-101, "refused"],
	[-102, "refused"],
	[-104, "refused"],
	[-109, "refused"],
	[-7, "timed-out"],
	[-118, "timed-out"],
]);

export function loadFailureKindOf(code: number): LoadFailureKind | null {
	if (code === ABORTED) {
		return null;
	}

	if (code >= CERTIFICATE_FIRST && code <= CERTIFICATE_LAST) {
		return "certificate";
	}

	return KIND_OF_CODE.get(code) ?? null;
}
