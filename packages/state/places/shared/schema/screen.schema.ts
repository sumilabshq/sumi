import { z } from "zod";
import { SplitNodeSchema } from "./splits.schema.js";
import { PageAppSchema } from "./tabs.schema.js";

export const StudioViewSchema = z.union([z.literal("app"), PageAppSchema]);

export type StudioView = z.infer<typeof StudioViewSchema>;

export const PageFactsSchema = z.object({
	pageId: z.string(),
	title: z.string(),
	url: z.string(),
	favicon: z.string().nullable(),
	isInkReading: z.boolean(),
	isAskWaiting: z.boolean(),
	isClosedToInk: z.boolean(),
	isInOwnWindow: z.boolean(),
});

export type PageFacts = z.infer<typeof PageFactsSchema>;

export const ScreenSchema = z.object({
	pages: z.array(PageFactsSchema),
	isBrowserAvailable: z.boolean(),
	canOpenOwnWindow: z.boolean(),
	tabPanes: z.array(z.object({ paneId: z.string(), tabId: z.string() })),
	shownTabPaneId: z.string().nullable(),
	tabTargetId: z.string().nullable(),
	chatGroups: z.array(z.object({ chatId: z.string(), paneIds: z.array(z.string()) })),
	elsewhere: z.array(z.object({ window: z.string(), tabIds: z.array(z.string()) })),
	focusedChatId: z.string().nullable(),
});

export type Screen = z.infer<typeof ScreenSchema>;

export const TabsAskSchema = z.object({
	window: z.string().min(1),
	view: StudioViewSchema,
	screen: ScreenSchema,
});

export type TabsAsk = z.infer<typeof TabsAskSchema>;

export const TabEffectSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("open-page"), pageId: z.string() }),
	z.object({ kind: z.literal("close-page"), pageId: z.string() }),
	z.object({ kind: z.literal("show-page"), pageId: z.string() }),
	z.object({ kind: z.literal("open-address"), pageId: z.string(), address: z.string(), isShown: z.boolean() }),
	z.object({ kind: z.literal("reload-page"), pageId: z.string() }),
	z.object({ kind: z.literal("open-own-window"), pageId: z.string() }),
	z.object({ kind: z.literal("focus-own-window"), pageId: z.string() }),
	z.object({ kind: z.literal("focus-window"), window: z.string() }),
	z.object({ kind: z.literal("tear-off-page"), pageId: z.string(), tabId: z.string() }),
	z.object({ kind: z.literal("close-panes"), tabIds: z.array(z.string()) }),
	z.object({ kind: z.literal("close-chat-panes"), chatIds: z.array(z.string()) }),
	z.object({ kind: z.literal("open-shown-tab-pane") }),
	z.object({ kind: z.literal("close-shown-tab-pane") }),
	z.object({ kind: z.literal("show-in-target-pane"), tabId: z.string() }),
	z.object({ kind: z.literal("show-chat"), chatId: z.string() }),
	z.object({
		kind: z.literal("show-in-chat-group"),
		chatId: z.string(),
		tabId: z.string(),
		isOnlyWhenBare: z.boolean(),
	}),
	z.object({ kind: z.literal("flash-pane"), paneId: z.string() }),
	z.object({
		kind: z.literal("show-split"),
		layout: SplitNodeSchema,
		chatIds: z.array(z.string()),
		focusedId: z.string(),
	}),
	z.object({ kind: z.literal("focus-split"), focusedId: z.string() }),
	z.object({ kind: z.literal("leave-split") }),
]);

export type TabEffect = z.infer<typeof TabEffectSchema>;

export const TabsSettledSchema = z.object({
	view: StudioViewSchema,
	effects: z.array(TabEffectSchema),
});

export type TabsSettled = z.infer<typeof TabsSettledSchema>;

export const OpenedTabSettledSchema = z.object({
	id: z.string(),
	view: StudioViewSchema,
	effects: z.array(TabEffectSchema),
});
