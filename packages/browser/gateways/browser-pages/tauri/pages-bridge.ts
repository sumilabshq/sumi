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
});

export type PageFacts = z.infer<typeof PageFactsSchema>;

const PageEventBaseSchema = z.object({
	page: z.string(),
	facts: PageFactsSchema,
	failure: PageFailureSchema.nullable(),
});

const PageLoadEventSchema = PageEventBaseSchema.extend({
	kind: z.enum(["started", "committed", "finished", "title", "failed", "stopped"]),
});

const OwnWindowEventSchema = PageEventBaseSchema.extend({
	kind: z.enum(["own-window-opened", "own-window-closed"]),
});

export const PageEventSchema = z.union([PageLoadEventSchema, OwnWindowEventSchema]);

export type PageLoadEvent = z.infer<typeof PageLoadEventSchema>;
export type OwnWindowEvent = z.infer<typeof OwnWindowEventSchema>;
export type PageEvent = PageLoadEvent | OwnWindowEvent;

export function isOwnWindowEvent(event: PageEvent): event is OwnWindowEvent {
	return OwnWindowEventSchema.shape.kind.safeParse(event.kind).success;
}

const FrameAnswersSchema = z.array(
	z.object({
		url: z.string(),
		answer: z.string().nullable(),
	}),
);

const OwnWindowsSchema = z.array(z.string()).readonly();

export type FrameAnswer = z.infer<typeof FrameAnswersSchema>[number];

export interface PagePlacement {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly corner: number;
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
	place(page: string, placement: PagePlacement): Promise<void>;
	show(frames: readonly PageFrame[]): Promise<void>;
	cover(page: string, covered: boolean): Promise<void>;
	openInOwnWindow(page: string, title: string): Promise<void>;
	focusOwnWindow(page: string): Promise<void>;
	watchTearOff(page: string, title: string): Promise<void>;
	stopTearOff(): Promise<void>;
	ownWindows(): Promise<readonly string[]>;
	snapshot(page: string, region: PageRegion | null, format: ShotFormat): Promise<Uint8Array>;
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
		place: (page, placement) => done("place", { page, ...placement }),
		show: (frames) => done("show", { frames }),
		cover: (page, covered) => done("cover", { page, covered }),
		openInOwnWindow: (page, title) => done("open_own_window", { page, title }),
		focusOwnWindow: (page) => done("focus_own_window", { page }),
		watchTearOff: (page, title) => done("watch_tear_off", { page, title }),
		stopTearOff: () => done("stop_tear_off", {}),
		ownWindows: async () => OwnWindowsSchema.parse(await call("own_windows")),
		snapshot: async (page, region, format) => bytesOf(await call("snapshot", { page, region, format })),
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
