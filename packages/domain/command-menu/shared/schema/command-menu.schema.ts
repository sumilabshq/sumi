import { z } from "zod";

export const DoorSchema = z.enum(["anywhere", "new-tab", "ask", "this-tab"]);

export type Door = z.infer<typeof DoorSchema>;

export const KeptMenuSchema = z.object({
	isOpen: z.boolean(),
	door: DoorSchema,
	text: z.string(),
	opening: z.number().int().nonnegative(),
	newTabList: z.string().nullable(),
	pageId: z.string().nullable().default(null),
});

export type KeptMenu = z.infer<typeof KeptMenuSchema>;

export const OpenMenuSchema = z.object({
	door: DoorSchema,
	text: z.string().nullable(),
	shownName: z.string().default(""),
	newTabList: z.string().nullable().default(null),
	pageId: z.string().nullable().default(null),
});

export const ResultsAskSchema = z.object({
	text: z.string(),
	door: DoorSchema,
	pageId: z.string().nullable().default(null),
});

export type ResultsAsk = z.infer<typeof ResultsAskSchema>;

export const WhereSchema = z.enum(["new-tab", "this-tab"]);

export const MenuCommandSchema = z.enum(["new-chat", "new-tab"]);

export type MenuCommand = z.infer<typeof MenuCommandSchema>;

export const IntentSchema = z.discriminatedUnion("do", [
	z.object({
		do: z.literal("show-tab"),
		id: z.string(),
		title: z.string(),
	}),
	z.object({
		do: z.literal("reopen-closed"),
		tabId: z.string().min(1),
		title: z.string(),
	}),
	z.object({
		do: z.literal("show-essential"),
		id: z.string(),
		title: z.string(),
	}),
	z.object({
		do: z.literal("open-chat"),
		id: z.string(),
		title: z.string(),
	}),
	z.object({
		do: z.literal("open-chat-elsewhere"),
		workspaceId: z.string(),
		chatId: z.string(),
		title: z.string(),
		workspaceName: z.string(),
	}),
	z.object({
		do: z.literal("open-workspace"),
		id: z.string(),
		title: z.string(),
	}),
	z.object({
		do: z.literal("open-app"),
		app: z.enum(["canvas", "browser", "terminal", "tasks"]),
		title: z.string(),
	}),
	z.object({
		do: z.literal("open-address"),
		address: z.string().min(1),
		where: WhereSchema,
	}),
	z.object({
		do: z.literal("run"),
		command: MenuCommandSchema,
	}),
	z.object({
		do: z.literal("ask-ink"),
		text: z.string().min(1),
		sends: z.boolean(),
	}),
	z.object({
		do: z.literal("close-tab"),
		id: z.string(),
		title: z.string(),
	}),
	z.object({
		do: z.literal("pin-chat"),
		id: z.string(),
		isPinned: z.boolean(),
	}),
]);

export type Intent = z.infer<typeof IntentSchema>;

export const RenamedSchema = z.enum(["tab", "chat", "workspace"]);

export const RenameAskSchema = z.object({
	kind: RenamedSchema,
	id: z.string(),
	name: z.string(),
});

export const RowGlyphSchema = z.enum(["search", "globe", "plus", "ink", "pencil"]);

export const RowIconSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("tab"),
		art: z.string(),
		favicon: z.string().nullable(),
		title: z.string(),
		address: z.string().nullable(),
		mark: z.enum(["none", "running", "unread"]),
	}),
	z.object({
		kind: z.literal("letter"),
		letter: z.string(),
		shape: z.enum(["square", "round"]),
	}),
	z.object({
		kind: z.literal("glyph"),
		glyph: RowGlyphSchema,
	}),
]);

export type RowIcon = z.infer<typeof RowIconSchema>;

export const RowKindSchema = z.enum([
	"tab",
	"closed-tab",
	"chat",
	"app",
	"site",
	"workspace",
	"address",
	"search",
	"ask",
]);

export type RowKind = z.infer<typeof RowKindSchema>;

export const RowActionSchema = z.object({
	label: z.string(),
	shortcut: z.string().nullable(),
	isDanger: z.boolean(),
	intent: IntentSchema.nullable(),
	isRename: z.boolean(),
});

export type RowAction = z.infer<typeof RowActionSchema>;

export const MatchSchema = z.object({
	start: z.number().int().nonnegative(),
	length: z.number().int().positive(),
});

export const RowSchema = z.object({
	key: z.string(),
	kind: RowKindSchema,
	title: z.string(),
	meta: z.string(),
	icon: RowIconSchema,
	match: MatchSchema.nullable(),
	kindLabel: z.string(),
	doLabel: z.string(),
	shortcut: z.string().nullable(),
	isFallback: z.boolean(),
	intent: IntentSchema,
	renames: z
		.object({
			kind: RenamedSchema,
			id: z.string(),
		})
		.nullable(),
	actions: z.array(RowActionSchema),
});

export type Row = z.infer<typeof RowSchema>;

export const SectionSchema = z.object({
	label: z.string(),
	layout: z.enum(["list", "grid"]),
	rows: z.array(RowSchema),
});

export type Section = z.infer<typeof SectionSchema>;

export const ResultsSchema = z.object({
	door: DoorSchema,
	foundCount: z.number().int().nonnegative().nullable(),
	sections: z.array(SectionSchema),
	ghost: z.string(),
	fallbackIntent: IntentSchema.nullable(),
	fallbackLabel: z.string(),
	askInk: IntentSchema.nullable(),
});

export type Results = z.infer<typeof ResultsSchema>;

export const DoneSchema = z.object({
	said: z.string(),
	isMenuKept: z.boolean(),
});

export type Done = z.infer<typeof DoneSchema>;
