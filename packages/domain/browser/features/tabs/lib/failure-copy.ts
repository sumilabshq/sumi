import type { MascotState } from "@widgetarium/mascot";
import type { PageFailureKind } from "../../../shared/schema/browser-tab.schema.js";
import { urlOf } from "../../../shared/lib/site-key.js";

export interface FailureCopy {
	readonly mood: MascotState;
	readonly title: string;
	readonly reason: string;
}

const JAVASCRIPT = "javascript:";

const COPY: Readonly<Record<PageFailureKind, FailureCopy>> = {
	"not-found": {
		mood: "question",
		title: "{host} didn't answer",
		reason: "No server answers at this address. It may be mistyped, or the site may be gone.",
	},
	offline: {
		mood: "sleep",
		title: "You're offline",
		reason: "Check your Wi‑Fi or cable. This tab reloads by itself when you're back.",
	},
	refused: {
		mood: "thinking",
		title: "{host} refused to connect",
		reason: "It turned the connection away. The site may be down or busy.",
	},
	"timed-out": {
		mood: "thinking",
		title: "{host} took too long",
		reason: "It didn't reply in time, so the browser stopped waiting. The site may be down, or busy right now.",
	},
	certificate: {
		mood: "surprised",
		title: "This site's certificate isn't valid",
		reason: "Someone could be posing as {host}. Nothing you type here is safe.",
	},
	scheme: {
		mood: "error",
		title: "{scheme} links don't open here",
		reason: "This address opens something other than a web page, so the browser stops it.",
	},
};

const RUNS_CODE = "This link runs code instead of opening a page, so the browser stops it.";

export function failureCopyOf(kind: PageFailureKind, address: string): FailureCopy {
	const copy = COPY[kind];
	const scheme = schemeOf(address);
	const filled = (text: string): string => text.replace("{host}", hostOf(address)).replace("{scheme}", scheme);

	return {
		mood: copy.mood,
		title: filled(copy.title),
		reason: kind === "scheme" && scheme === JAVASCRIPT ? RUNS_CODE : filled(copy.reason),
	};
}

export function hostOf(address: string): string {
	return urlOf(address)?.hostname ?? address;
}

function schemeOf(address: string): string {
	const colon = address.indexOf(":");

	return colon === -1 ? address : address.slice(0, colon + 1).toLowerCase();
}
