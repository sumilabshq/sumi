import type { GhostLay, GhostWorn } from "../../../shared/schema/tear-off-ghost.schema.js";
import { z } from "zod";
import { PageFailureSchema } from "../../../shared/schema/browser-tab.schema.js";
import type { PageRegion } from "../../../shared/schema/page-read.schema.js";

export interface BrowserPagesIpc {
	invoke(command: string, args?: Readonly<Record<string, unknown>>): Promise<unknown>;
	channel(onMessage: (message: unknown) => void): unknown;
}

export const PageFactsSchema = z.object({
	url: z.string(),
	title: z.string(),
	canGoBack: z.boolean(),
	canGoForward: z.boolean(),
	isLoading: z.boolean(),
	window: z.string().nullable(),
});

export type PageFacts = z.infer<typeof PageFactsSchema>;

export interface PageHole {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

const PageEventBaseSchema = z.object({
	page: z.string(),
	facts: PageFactsSchema,
	failure: PageFailureSchema.nullable(),
});

const PageLoadEventSchema = PageEventBaseSchema.extend({
	kind: z.enum(["started", "committed", "finished", "title", "failed", "stopped", "moved"]),
});

const OwnWindowEventSchema = PageEventBaseSchema.extend({
	kind: z.enum(["own-window-opened", "own-window-closed"]),
});

const PagePressedEventSchema = z.object({
	page: z.string(),
	kind: z.literal("pressed"),
});

const PageHoveredEventSchema = z.object({
	page: z.string(),
	kind: z.literal("hovered"),
	x: z.number(),
	y: z.number(),
});

const PageKeyedEventSchema = z.object({
	page: z.string(),
	kind: z.literal("keyed"),
	key: z.string(),
});

const WindowClosedEventSchema = z.object({
	kind: z.literal("window-closed"),
	window: z.string(),
});

export const PageEventSchema = z.union([
	PageLoadEventSchema,
	OwnWindowEventSchema,
	PagePressedEventSchema,
	PageHoveredEventSchema,
	PageKeyedEventSchema,
	WindowClosedEventSchema,
]);

export type PageLoadEvent = z.infer<typeof PageLoadEventSchema>;
export type OwnWindowEvent = z.infer<typeof OwnWindowEventSchema>;
export type PagePressedEvent = z.infer<typeof PagePressedEventSchema>;
export type PageHoveredEvent = z.infer<typeof PageHoveredEventSchema>;
export type PageKeyedEvent = z.infer<typeof PageKeyedEventSchema>;
export type WindowClosedEvent = z.infer<typeof WindowClosedEventSchema>;
export type PageEvent =
	| PageLoadEvent
	| OwnWindowEvent
	| PagePressedEvent
	| PageHoveredEvent
	| PageKeyedEvent
	| WindowClosedEvent;
export type PageInputEvent = PagePressedEvent | PageHoveredEvent | PageKeyedEvent;

export function isOwnWindowEvent(event: PageEvent): event is OwnWindowEvent {
	return OwnWindowEventSchema.shape.kind.safeParse(event.kind).success;
}

export function isPagePressedEvent(event: PageEvent): event is PagePressedEvent {
	return event.kind === "pressed";
}

function isPageHoveredEvent(event: PageEvent): event is PageHoveredEvent {
	return event.kind === "hovered";
}

export function isPageKeyedEvent(event: PageEvent): event is PageKeyedEvent {
	return event.kind === "keyed";
}

export function isPageInputEvent(event: PageEvent): event is PageInputEvent {
	return isPagePressedEvent(event) || isPageHoveredEvent(event) || isPageKeyedEvent(event);
}

export function isWindowClosedEvent(event: PageEvent): event is WindowClosedEvent {
	return event.kind === "window-closed";
}

const FrameAnswersSchema = z.array(
	z.object({
		url: z.string(),
		answer: z.string().nullable(),
	}),
);

const OwnWindowsSchema = z.array(z.string()).readonly();

const StudioWindowOpenedSchema = z.object({ window: z.string() });

export interface ScreenPoint {
	readonly x: number;
	readonly y: number;
}

export type FrameAnswer = z.infer<typeof FrameAnswersSchema>[number];

export interface PagePlacement {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly corner: number;
	readonly cornerSides: number;
}

export interface PageFrame extends PagePlacement {
	readonly page: string;
}

export type ShotFormat = "png" | "jpeg";

export interface PagesBridge {
	open(onEvent: (event: PageEvent) => void): Promise<void>;
	create(page: string, profile: string): Promise<void>;
	close(page: string): Promise<void>;
	navigate(page: string, url: string): Promise<void>;
	back(page: string): Promise<void>;
	forward(page: string): Promise<void>;
	reload(page: string): Promise<void>;
	facts(page: string): Promise<PageFacts>;
	wearAppearance(isDark: boolean): Promise<void>;
	place(page: string, placement: PagePlacement): Promise<void>;
	show(frames: readonly PageFrame[]): Promise<void>;
	cover(page: string, covered: boolean): Promise<void>;
	cut(page: string, holes: readonly PageHole[]): Promise<void>;
	wearFrame(colour: string): Promise<void>;
	openInOwnWindow(page: string, title: string): Promise<void>;
	focusOwnWindow(page: string): Promise<void>;
	openOwnWindowAtCursor(page: string, title: string): Promise<boolean>;
	layTearOffGhost(lay: GhostLay): Promise<void>;
	wearTearOffGhost(worn: GhostWorn): Promise<void>;
	showTearOffGhost(shown: boolean): Promise<void>;
	ownWindows(): Promise<readonly string[]>;
	standingPages(): Promise<readonly string[]>;
	openStudioWindow(tab: string, at: ScreenPoint | null): Promise<string>;
	focusWindow(window: string): Promise<void>;
	openChatWindow(chat: string, at: ScreenPoint | null): Promise<string>;
	snapshot(page: string, region: PageRegion | null, format: ShotFormat): Promise<Uint8Array>;
	pageShot(page: string, region: PageRegion): Promise<Uint8Array>;
	evaluate(page: string, script: string): Promise<string>;
	evaluateInFrames(page: string, script: string): Promise<readonly FrameAnswer[]>;
}

const COMMAND = "plugin:browser|{name}";
const NOT_AN_EVENT = "[widgetarium] the browser sent an event Widgetarium cannot read";
const NOT_BYTES = "The page picture did not arrive as bytes.";
const NOT_TEXT = "The page answered something that is not text.";

export function tauriPagesBridge(ipc: BrowserPagesIpc): PagesBridge {
	const call = (name: string, args?: Readonly<Record<string, unknown>>): Promise<unknown> =>
		ipc.invoke(commandNamed(name), args);
	const done = async (name: string, args: Readonly<Record<string, unknown>>): Promise<void> => {
		await call(name, args);
	};

	return {
		open: (onEvent) => done("open", { onEvent: ipc.channel(eventReader(onEvent)) }),
		create: (page, profile) => done("create", { page, profile }),
		close: (page) => done("close", { page }),
		navigate: (page, url) => done("navigate", { page, url }),
		back: (page) => done("back", { page }),
		forward: (page) => done("forward", { page }),
		reload: (page) => done("reload", { page }),
		facts: async (page) => PageFactsSchema.parse(await call("facts", { page })),
		wearAppearance: (isDark) => done("appearance", { dark: isDark }),
		place: (page, placement) => done("place", { page, ...placement }),
		show: (frames) => done("show", { frames }),
		cover: (page, covered) => done("cover", { page, covered }),
		cut: (page, holes) => done("cut", { page, holes }),
		wearFrame: (colour) => done("wear_frame", { colour }),
		openInOwnWindow: (page, title) => done("open_own_window", { page, title }),
		focusOwnWindow: (page) => done("focus_own_window", { page }),
		openOwnWindowAtCursor: async (page, title) => (await call("open_own_window_at_cursor", { page, title })) === true,
		layTearOffGhost: (lay) => done("lay_tear_off_ghost", { ...lay }),
		wearTearOffGhost: (worn) => done("wear_tear_off_ghost", { worn }),
		showTearOffGhost: (shown) => done("show_tear_off_ghost", { shown }),
		ownWindows: async () => OwnWindowsSchema.parse(await call("own_windows")),
		standingPages: async () => OwnWindowsSchema.parse(await call("standing_pages")),
		openStudioWindow: async (tab, at) =>
			StudioWindowOpenedSchema.parse(await call("open_studio_window", { tab, at })).window,
		focusWindow: (window) => done("focus_window", { window }),
		openChatWindow: async (chat, at) =>
			StudioWindowOpenedSchema.parse(await call("open_chat_window", { chat, at })).window,
		snapshot: async (page, region, format) => bytesOf(await call("snapshot", { page, region, format })),
		pageShot: async (page, region) => bytesOf(await call("page_shot", { page, region })),
		evaluate: async (page, script) => textOf(await call("evaluate", { page, script })),
		evaluateInFrames: async (page, script) => FrameAnswersSchema.parse(await call("evaluate_frames", { page, script })),
	};
}

const commandNamed = (name: string): string => COMMAND.replace("{name}", name);

function bytesOf(answer: unknown): Uint8Array {
	if (answer instanceof ArrayBuffer) {
		return new Uint8Array(answer);
	}

	if (answer instanceof Uint8Array) {
		return answer;
	}

	if (Array.isArray(answer) && answer.every((byte) => typeof byte === "number")) {
		return Uint8Array.from(answer);
	}

	throw new Error(NOT_BYTES);
}

function textOf(answer: unknown): string {
	if (typeof answer !== "string") {
		throw new Error(NOT_TEXT);
	}

	return answer;
}

function eventReader(onEvent: (event: PageEvent) => void): (message: unknown) => void {
	return (message) => {
		const read = PageEventSchema.safeParse(message);

		if (!read.success) {
			console.error(NOT_AN_EVENT, read.error);
			return;
		}

		onEvent(read.data);
	};
}
