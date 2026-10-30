import { PageContentReadSchema, PageLayoutSchema } from "../../../shared/schema/page-read.schema.js";
import type {
	PageContentRead,
	PageForm,
	PageLayout,
	PageShot,
	ShotAsk,
} from "../../../shared/schema/page-read.schema.js";
import { FIND_SECRET_FIELD, PAGE_LAYOUT, READ_DOM, READ_PAGE } from "../../../shared/lib/page-scripts.js";
import { regionOnPage } from "../../../shared/lib/region-within.js";
import type { PagesBridge } from "./pages-bridge.js";
import { BUSY_REASON_SCRIPT, NO_BUSY_REASON } from "./page-busy-script.js";

export interface ShotPage {
	readonly page: string;
	readonly url: string;
}

const FRAME_ADDRESS = "location.href";
const UNREADABLE = "the page answered something that is not its content";
const SECRET_FOUND = "true";
const BUSY_ANSWER_WITHIN_MS = 3000;
const BUSY_UNANSWERED = "the page did not answer in time";
const FRAME_UNANSWERED = "a frame did not answer";
const MOST_SHOT_CHARACTERS = 5_000_000;
const SHOT_TOO_HEAVY = "the shot weighs {mb} MB, over the 5 MB a model takes; ask for a smaller region";
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

export async function shotOf(
	bridge: PagesBridge,
	{ page, url }: ShotPage,
	{ area, region }: ShotAsk,
): Promise<PageShot> {
	const layout = await layoutOf(bridge, page);
	const png =
		area === "page"
			? await bridge.pageShot(page, regionOnPage(region, layout.page))
			: await bridge.snapshot(page, region, "png");
	return {
		url,
		png: base64WithinShotLimit(png),
		...pngSizeOf(png),
		layout,
	};
}

export async function hasSecretFieldIn(bridge: PagesBridge, page: string): Promise<boolean> {
	const answers = await answersInAllFrames(bridge, page, asJson(FIND_SECRET_FIELD));

	return answers.includes(SECRET_FOUND);
}

export async function busyReasonIn(bridge: PagesBridge, page: string): Promise<string | null> {
	const timeout = new Promise<null>((answer) => setTimeout(() => answer(null), BUSY_ANSWER_WITHIN_MS));
	const answers = await Promise.race([answersInAllFrames(bridge, page, BUSY_REASON_SCRIPT), timeout]);

	if (answers === null) {
		return BUSY_UNANSWERED;
	}

	const reason = answers.find((answer) => answer !== NO_BUSY_REASON);
	return reason === undefined ? null : (reason ?? FRAME_UNANSWERED);
}

export async function frameUrlsOf(bridge: PagesBridge, page: string): Promise<readonly string[]> {
	const frames = await bridge.evaluateInFrames(page, FRAME_ADDRESS);

	return frames.map((frame) => frame.answer ?? frame.url);
}

async function layoutOf(bridge: PagesBridge, page: string): Promise<PageLayout> {
	const layout = PageLayoutSchema.safeParse(parsedJson(await bridge.evaluate(page, asJson(PAGE_LAYOUT))));

	if (!layout.success) {
		throw new Error(UNREADABLE);
	}

	return layout.data;
}

async function answersInAllFrames(
	bridge: PagesBridge,
	page: string,
	script: string,
): Promise<readonly (string | null)[]> {
	const [inMainFrame, inFrames] = await Promise.all([
		bridge.evaluate(page, script),
		bridge.evaluateInFrames(page, script),
	]);

	return [inMainFrame, ...inFrames.map((frame) => frame.answer)];
}

function base64WithinShotLimit(png: Uint8Array): string {
	const encoded = base64Of(png);

	if (encoded.length > MOST_SHOT_CHARACTERS) {
		throw new Error(SHOT_TOO_HEAVY.replace("{mb}", (encoded.length / 1_000_000).toFixed(1)));
	}

	return encoded;
}

function pngSizeOf(png: Uint8Array): { readonly width: number; readonly height: number } {
	const header = new DataView(png.buffer, png.byteOffset, png.byteLength);

	return {
		width: header.getUint32(PNG_WIDTH_AT),
		height: header.getUint32(PNG_HEIGHT_AT),
	};
}

function base64Of(bytes: Uint8Array): string {
	const parts: string[] = [];

	for (let at = 0; at < bytes.length; at += BASE64_CHUNK) {
		parts.push(String.fromCharCode(...bytes.subarray(at, at + BASE64_CHUNK)));
	}

	return btoa(parts.join(""));
}

function asJson(script: string): string {
	return `JSON.stringify(${script})`;
}

function parsedJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(UNREADABLE);
	}
}
