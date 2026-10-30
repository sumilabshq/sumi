import type { TabArt } from "../../schema/tab-rows.schema.js";
import type { AppKind } from "../../schema/tabs.schema.js";

const ART_OF_EXTENSION: Readonly<Record<string, TabArt>> = {
	md: "note",
	txt: "note",
	csv: "table",
	ts: "code-ts",
	tsx: "code-ts",
	js: "code-js",
	jsx: "code-js",
	mjs: "code-js",
	py: "code-py",
	css: "code-css",
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	webp: "image",
	svg: "image",
};

const ART_OF_APP: Readonly<Record<Exclude<AppKind, "browser">, TabArt>> = {
	canvas: "canvas",
	terminal: "terminal",
	chat: "chat",
};

export function tabArtOf(app: AppKind, address: string | null): TabArt {
	if (app !== "browser") {
		return ART_OF_APP[app];
	}

	if (address === null || address === "") {
		return "browser";
	}

	return ART_OF_EXTENSION[extensionOf(address)] ?? "site";
}

export function hostOf(url: string): string | null {
	try {
		return new URL(url).host || null;
	} catch {
		return null;
	}
}

function extensionOf(address: string): string {
	try {
		const { pathname } = new URL(address);
		const last = pathname.split("/").at(-1) ?? "";
		return last.includes(".") ? (last.split(".").at(-1) ?? "").toLowerCase() : "";
	} catch {
		return "";
	}
}
