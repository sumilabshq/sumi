import type { ViewPart } from "@sumi/view-work/implementation";
import { FRAME_RUNTIME, TOKENS_STYLE_ID } from "./frame-runtime.js";
import { FRAME_SHEET } from "./frame-sheet.js";
import { fontFacesOf, tokenNamesOf, tokenSheetOf } from "./live-tokens.js";

export interface FrameAsk {
	readonly html: string;
	readonly parts: readonly ViewPart[];
	readonly host: Element;
}

export interface BuiltFrame {
	readonly source: string;
	readonly tokenNames: readonly string[];
}

const FRAME = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>{fonts}</style>
<style id="{tokensId}">{tokens}</style>
<style>{sheet}</style>
</head>
<body>{body}<script>{runtime}</script>{partScripts}</body>
</html>`;
const PART_SCRIPT = "<script>{script}</script>";

export async function frameOf({ html, parts, host }: FrameAsk): Promise<BuiltFrame> {
	const page = new DOMParser().parseFromString(`<!doctype html><html><head></head><body>${html}</body></html>`, "text/html");

	for (const part of parts) {
		await part.transform?.(page);
	}

	const sheet = [FRAME_SHEET, ...parts.map(({ css }) => css)].join("\n");
	const body = page.body.innerHTML;
	const tokenNames = tokenNamesOf(`${sheet}\n${body}`);
	const partScripts = parts
		.filter(({ script }) => script.trim() !== "")
		.map(({ script }) => PART_SCRIPT.replace("{script}", () => script))
		.join("");
	const source = FRAME.replace("{fonts}", () => fontFacesOf(host.ownerDocument))
		.replace("{tokensId}", TOKENS_STYLE_ID)
		.replace("{tokens}", () => tokenSheetOf(host, tokenNames))
		.replace("{sheet}", () => sheet)
		.replace("{body}", () => body)
		.replace("{runtime}", () => FRAME_RUNTIME)
		.replace("{partScripts}", () => partScripts);
	return {
		source,
		tokenNames,
	};
}
