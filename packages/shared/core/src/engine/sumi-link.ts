import { z } from "zod";

export const SUMI_LINK_SCHEME = "sumi:";

export const LinkAppSchema = z.string().regex(/^[a-z][a-z0-9-]*$/, "an app id is lowercase letters, digits and dashes");

export const LinkTargetSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("chat"),
		id: z.string().min(1),
	}),
	z.object({
		kind: z.literal("tab"),
		id: z.string().min(1),
	}),
	z.object({
		kind: z.literal("page"),
		app: LinkAppSchema,
		address: z.string(),
	}),
]);

export type LinkTarget = z.infer<typeof LinkTargetSchema>;

export type LinkRead =
	| {
			readonly ok: true;
			readonly target: LinkTarget;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

type HostRead = (href: string, rest: string) => LinkRead;

const SUMI_ADDRESS = /^sumi:\/\/([^/?#]*)(?:\/(.*))?$/;
const APP_ID = /^[a-z][a-z0-9-]*$/;
const NOT_SUMI = "{href} opens nowhere: Sumi opens sumi://<app>/<page> links and https:// pages";
const UNKNOWN_HOST = "{href} names no app, so there is nothing to open";
const NO_ID = "{href} names no {kind} to open";
const BAD_ESCAPE = "{href} carries a broken %-escape in its page";
const NESTED = "{href} names a {kind} inside another: a {kind} link holds one id";
const LEGACY_TASKS_APP = "tasks";

const HOST_READS: ReadonlyMap<string, HostRead> = new Map<string, HostRead>([
	["chat", (href, rest) => idLinkOf(href, "chat", rest)],
	["tab", (href, rest) => idLinkOf(href, "tab", rest)],
	["task", (href, rest) => legacyPageOf(href, LEGACY_TASKS_APP, rest)],
	["app", (href, rest) => legacyAppOf(href, rest)],
]);

export function linkOf(target: LinkTarget): string {
	if (target.kind === "page") {
		return `${SUMI_LINK_SCHEME}//${target.app}/${encodeURIComponent(target.address)}`;
	}

	return `${SUMI_LINK_SCHEME}//${target.kind}/${encodeURIComponent(target.id)}`;
}

export function isSumiLink(href: string): boolean {
	return href.startsWith(SUMI_LINK_SCHEME);
}

export function linkTargetOf(href: string): LinkRead {
	const parts = SUMI_ADDRESS.exec(href);
	const host = parts?.[1] ?? "";

	if (parts === null) {
		return refusedLink(NOT_SUMI, href);
	}

	const read = HOST_READS.get(host);

	if (read !== undefined) {
		return read(href, parts[2] ?? "");
	}

	if (!APP_ID.test(host)) {
		return refusedLink(UNKNOWN_HOST, href);
	}

	return pageLinkOf(href, host, parts[2] ?? "");
}

function idLinkOf(href: string, kind: "chat" | "tab", rest: string): LinkRead {
	if (rest.includes("/")) {
		return refusedLink(NESTED.replace(/{kind}/g, kind), href);
	}

	const id = decodedOf(rest);

	if (id === null) {
		return refusedLink(BAD_ESCAPE, href);
	}

	if (id === "") {
		return refusedLink(NO_ID.replace("{kind}", kind), href);
	}

	return {
		ok: true,
		target: {
			kind,
			id,
		},
	};
}

function legacyPageOf(href: string, app: string, rest: string): LinkRead {
	if (rest === "") {
		return refusedLink(NO_ID.replace("{kind}", "task"), href);
	}

	return pageLinkOf(href, app, rest);
}

function legacyAppOf(href: string, rest: string): LinkRead {
	if (!APP_ID.test(rest)) {
		return refusedLink(rest === "" ? NO_ID.replace("{kind}", "app") : UNKNOWN_HOST, href);
	}

	return pageLinkOf(href, rest, "");
}

function pageLinkOf(href: string, app: string, rest: string): LinkRead {
	const address = decodedOf(rest);

	if (address === null) {
		return refusedLink(BAD_ESCAPE, href);
	}

	return {
		ok: true,
		target: {
			kind: "page",
			app,
			address,
		},
	};
}

function decodedOf(escaped: string): string | null {
	try {
		return decodeURIComponent(escaped);
	} catch {
		return null;
	}
}

function refusedLink(words: string, href: string): LinkRead {
	return {
		ok: false,
		reason: words.replace("{href}", href),
	};
}
