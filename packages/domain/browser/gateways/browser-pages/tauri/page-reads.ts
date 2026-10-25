import { PageContentReadSchema, PageLayoutSchema } from "../../../shared/schema/page-read.schema.js";
import type { PageContentRead, PageForm, PageLayout } from "../../../shared/schema/page-read.schema.js";
import { FIND_SECRET_FIELD, PAGE_LAYOUT, READ_DOM, READ_PAGE } from "../../../shared/lib/page-scripts.js";
import type { PagesBridge } from "./pages-bridge.js";

const FAVICON = `(() => {
	const icon = document.querySelector('link[rel~="icon" i]');
	return icon && icon.href ? icon.href : new URL("/favicon.ico", location.href).href;
})()`;
const FRAME_ADDRESS = "location.href";
const UNREADABLE = "the page answered something that is not its content";
const SECRET_FOUND = "true";
const PNG_WIDTH_AT = 16;
const PNG_HEIGHT_AT = 20;
const BASE64_CHUNK = 0x8000;

export async function contentOf(bridge: PagesBridge, page: string, form: PageForm): Promise<PageContentRead> {
	const script = form === "dom" ? READ_DOM : READ_PAGE;
	const read = PageContentReadSchema.safeParse(parsedJson(await bridge.evaluate(page, asJson(script))));

	if (!read.success) {
		throw new Error(UNREADABLE);
	}

	return read.data;
}

export async function layoutOf(bridge: PagesBridge, page: string): Promise<PageLayout> {
	const layout = PageLayoutSchema.safeParse(parsedJson(await bridge.evaluate(page, asJson(PAGE_LAYOUT))));

	if (!layout.success) {
		throw new Error(UNREADABLE);
	}

	return layout.data;
}

export async function hasSecretFieldIn(bridge: PagesBridge, page: string): Promise<boolean> {
	const [inMainFrame, inFrames] = await Promise.all([
		bridge.evaluate(page, asJson(FIND_SECRET_FIELD)),
		bridge.evaluateInFrames(page, asJson(FIND_SECRET_FIELD)),
	]);

	return inMainFrame === SECRET_FOUND || inFrames.some((frame) => frame.answer === SECRET_FOUND);
}

export async function frameUrlsOf(bridge: PagesBridge, page: string): Promise<readonly string[]> {
	const frames = await bridge.evaluateInFrames(page, FRAME_ADDRESS);

	return frames.map((frame) => frame.answer ?? frame.url);
}

export async function faviconOf(bridge: PagesBridge, page: string): Promise<string | null> {
	const address = await bridge.evaluate(page, FAVICON).catch(() => "");

	return address.startsWith("http") ? address : null;
}

export function pngSizeOf(png: Uint8Array): { readonly width: number; readonly height: number } {
	const header = new DataView(png.buffer, png.byteOffset, png.byteLength);

	return {
		width: header.getUint32(PNG_WIDTH_AT),
		height: header.getUint32(PNG_HEIGHT_AT),
	};
}

export function base64Of(bytes: Uint8Array): string {
	const parts: string[] = [];

	for (let at = 0; at < bytes.length; at += BASE64_CHUNK) {
		parts.push(String.fromCharCode(...bytes.subarray(at, at + BASE64_CHUNK)));
	}

	return btoa(parts.join(""));
}

const asJson = (script: string): string => `JSON.stringify(${script})`;

function parsedJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(UNREADABLE);
	}
}
