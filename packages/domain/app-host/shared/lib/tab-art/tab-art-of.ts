import type { AppKind, TabArt } from "../../schema/app-tab.schema.js";

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

export function tabArtOf(app: AppKind, address: string | null): TabArt {
	if (app === "canvas") {
		return "canvas";
	}

	if (app === "terminal") {
		return "terminal";
	}

	if (address === null || address === "") {
		return "browser";
	}

	return ART_OF_EXTENSION[extensionOf(address)] ?? "site";
}

export function siteLetterOf(title: string, address: string | null): string {
	const host = hostOf(address ?? "")?.replace(/^www\./, "") ?? title;
	return (host.trim()[0] ?? "?").toUpperCase();
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
