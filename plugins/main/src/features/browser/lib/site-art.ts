const SITE_ART = "site";
const ART_OF_EXTENSION: Readonly<Record<string, string>> = {
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

export function siteArtOf(address: string): string {
	return ART_OF_EXTENSION[extensionOf(address)] ?? SITE_ART;
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
