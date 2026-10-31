import { z } from "zod";

export const SUMI_LINK_SCHEME = "sumi:";

export const LinkKindSchema = z.enum(["chat", "task", "tab", "app"]);

export type LinkKind = z.infer<typeof LinkKindSchema>;

export const LinkTargetSchema = z.object({
	kind: LinkKindSchema,
	id: z.string().min(1),
});

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

const SUMI_ADDRESS = /^sumi:\/\/([^/?#]*)\/([^/?#]*)$/;
const NOT_SUMI = "{href} is not a Sumi link: one reads sumi://<chat|task|tab|app>/<id>";
const UNKNOWN_KIND = "{href} names no chat, task, tab or app, so there is nothing to open";
const NO_ID = "{href} names no {kind} to open";
const BAD_ESCAPE = "{href} carries a broken %-escape in its id";

export function linkOf({ kind, id }: LinkTarget): string {
	return `${SUMI_LINK_SCHEME}//${kind}/${encodeURIComponent(id)}`;
}

export function isSumiLink(href: string): boolean {
	return href.startsWith(SUMI_LINK_SCHEME);
}

export function linkTargetOf(href: string): LinkRead {
	const parts = SUMI_ADDRESS.exec(href);

	if (parts === null) {
		return refusedLink(NOT_SUMI, href);
	}

	const kind = LinkKindSchema.safeParse(parts[1]);

	if (!kind.success) {
		return refusedLink(UNKNOWN_KIND, href);
	}

	return linkAt(href, kind.data, parts[2] ?? "");
}

function linkAt(href: string, kind: LinkKind, escapedId: string): LinkRead {
	const id = decodedOf(escapedId);

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
