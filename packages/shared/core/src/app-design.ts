import { z } from "zod";
import { SPEC_FOLDER } from "./app-spec.js";
import { issueSaidOf, jsonOf } from "./json-text.js";

export const DESIGN_FOLDER = "design";
export const DESIGN_FILE = "canvas.json";
export const REFERENCES_FOLDER = "references";

const THE_CANVAS = "the canvas";

export type ScreenState = z.infer<typeof StateSchema>;

export function statesOf(screen: z.infer<typeof ScreenSchema>): ScreenState[] {
	return screen.states ?? [{ name: screen.name, file: screen.file ?? "" }];
}

export type Design = z.infer<typeof DesignSchema>;

export type DesignRead =
	{ readonly design: Design; readonly refusal?: undefined } | { readonly design?: undefined; readonly refusal: string };

export function isSafeAppName(app: string): boolean {
	return app.trim() !== "" && !app.includes("/") && !app.includes("\\") && !app.includes("..");
}

export function designFolderOf(app: string): string {
	return `${SPEC_FOLDER}/${app}/${DESIGN_FOLDER}`;
}

export function designPathOf(app: string): string {
	return `${designFolderOf(app)}/${DESIGN_FILE}`;
}

export function screenPathOf(app: string, file: string): string {
	return `${designFolderOf(app)}/${file}`;
}

export function referencePathOf(app: string, file: string): string {
	return `${designFolderOf(app)}/${REFERENCES_FOLDER}/${file}`;
}

export function referenceFileOf(name: string, stamp: string): string {
	const cleaned = name.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
	return `${stamp}-${cleaned || "photo"}`;
}

export type ReferenceEntry = z.infer<typeof ReferenceSchema>;

export function withReferencesAdded(text: string | null, entries: readonly ReferenceEntry[]): string {
	const held: unknown = text === null ? {} : JSON.parse(text);
	const canvas = typeof held === "object" && held !== null && !Array.isArray(held) ? { ...held } : {};
	const kept: unknown = Reflect.get(canvas, "references");
	const references = [...(Array.isArray(kept) ? kept : []), ...entries];
	const screens: unknown = Reflect.get(canvas, "screens");
	return `${JSON.stringify({ ...canvas, screens: Array.isArray(screens) ? screens : [], references }, null, 2)}\n`;
}

export function withReferenceNoted(
	text: string,
	named: string,
	note: Readonly<Record<string, unknown>>,
): string | null {
	const held: unknown = JSON.parse(text);
	if (typeof held !== "object" || held === null || Array.isArray(held)) return null;
	const references = listIn(held, "references");
	const at = references.findIndex((one) => isNamedReference(one, named));
	const reference = references[at];
	if (typeof reference !== "object" || reference === null) return null;
	const notes = listIn(reference, "notes");
	const same = notes.findIndex(
		(one) => typeof one === "object" && one !== null && Reflect.get(one, "text") === note["text"],
	);
	const noted = {
		...reference,
		notes: same === -1 ? [...notes, note] : notes.map((one, index) => (index === same ? note : one)),
	};
	return `${JSON.stringify({ ...held, references: references.map((one, index) => (index === at ? noted : one)) }, null, 2)}\n`;
}

export function screenFileOf(screen: string, state: string | undefined): string {
	const named = state ? `${screen} · ${state}` : screen;
	return `${named.replace(/[\\/:*?"<>|]+/g, "-").trim()}.md`;
}

export function screenNoteOf(widget: string, values: Readonly<Record<string, string>>): string {
	const props = Object.entries(values).map(
		([prop, value]) =>
			`      ${prop}: { implementation: "@core/typed-value", fields: { value: ${JSON.stringify(typedOf(value))} } }`,
	);
	return [
		"---",
		"widgetarium: { kind: screen }",
		"---",
		"",
		"```widgetarium",
		"v: 2",
		"mode: expanded",
		"tiles:",
		"  - id: screen",
		`    widget: ${JSON.stringify(widget)}`,
		...(props.length > 0 ? ["    props:", ...props] : []),
		"layout:",
		"  dir: row",
		"  of:",
		"    - dir: column",
		"      keep: true",
		"      of: [{ id: screen }]",
		"```",
		"",
	].join("\n");
}

export interface ScreenPlacement {
	readonly screen: string;
	readonly state: string | undefined;
	readonly file: string;
	readonly situation: string | undefined;
	readonly size?: FrameSize | undefined;
}

export function withScreenAdded(text: string | null, placement: ScreenPlacement): string {
	const held: unknown = text === null ? {} : JSON.parse(text);
	const canvas = typeof held === "object" && held !== null && !Array.isArray(held) ? { ...held } : {};
	const kept: unknown = Reflect.get(canvas, "screens");
	const screens: unknown[] = Array.isArray(kept) ? [...kept] : [];
	const { screen } = placement;
	const at = screens.findIndex((one) => typeof one === "object" && one !== null && Reflect.get(one, "name") === screen);
	const placed = at === -1 ? undefined : screens[at];
	screens.splice(at === -1 ? screens.length : at, at === -1 ? 0 : 1, screenWith(placed, placement));
	const references: unknown = Reflect.get(canvas, "references");
	return `${JSON.stringify({ ...canvas, screens, references: Array.isArray(references) ? references : [] }, null, 2)}\n`;
}

export function readDesign(text: string): DesignRead {
	const held = jsonOf(text, THE_CANVAS);
	if (held.refusal !== undefined) return { refusal: held.refusal };
	const parsed = DesignSchema.safeParse(held.value);
	if (parsed.success) return { design: parsed.data };
	return { refusal: issueSaidOf(parsed.error, THE_CANVAS) };
}

export function isNothingDrawn(text: string): boolean {
	const held = jsonOf(text, THE_CANVAS);
	if (held.refusal !== undefined) return false;
	const parsed = DesignFieldsSchema.safeParse(held.value);
	return parsed.success && parsed.data.screens.length + parsed.data.references.length === 0;
}

export const FRAME_SIZES = {
	phone: { width: 390, height: 844 },
	tablet: { width: 834, height: 1194 },
	desktop: { width: 1280, height: 832 },
} as const;

const FRAME_PX = z.number().int().min(240).max(4000);

const FrameSizeSchema = z.union([
	z.enum(["phone", "tablet", "desktop"]),
	z.object({ width: FRAME_PX, height: FRAME_PX }),
]);

export type FrameSize = z.infer<typeof FrameSizeSchema>;

export function framePixelsOf(
	size: FrameSize | undefined,
): { readonly width: number; readonly height: number } | undefined {
	if (size === undefined) return undefined;
	return typeof size === "string" ? FRAME_SIZES[size] : size;
}

const FRAME_SIZE_WRITTEN = /^(\d+)\s*[x×]\s*(\d+)$/;

export function frameSizeIn(said: string): FrameSize | null {
	const word = said.trim().toLowerCase();
	if (word === "phone" || word === "tablet" || word === "desktop") return word;
	const found = word.match(FRAME_SIZE_WRITTEN);
	if (!found) return null;
	const parsed = FrameSizeSchema.safeParse({ width: Number(found[1]), height: Number(found[2]) });
	return parsed.success ? parsed.data : null;
}

const ScreenFileSchema = z
	.string()
	.trim()
	.min(1)
	.regex(/\.md$/, { message: "a screen's file is a .md note holding one widgetarium block" })
	.refine((file) => !file.includes("/") && !file.includes("\\") && !file.includes(".."), {
		message: "a screen's file is a name inside the design folder, never a path",
	});

export const REFERENCE_KINDS = ["app", "site", "marketing", "photo"] as const;

export const NOTE_TONES = ["take", "like", "dislike", "note"] as const;

const ReferenceNoteSchema = z.object({
	text: z.string().trim().min(1),
	tone: z.enum(NOTE_TONES).default("note"),
	at: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
	into: z.string().trim().min(1).optional(),
});

export type ReferenceNote = z.infer<typeof ReferenceNoteSchema>;

const ReferenceReadingSchema = {
	why: z.string().trim().min(1).optional(),
	kind: z.enum(REFERENCE_KINDS).optional(),
	pages: z.array(z.string().trim().min(1)).optional(),
	notes: z.array(ReferenceNoteSchema).optional(),
};

const ReferenceFileSchema = z.object({
	file: z
		.string()
		.trim()
		.regex(/\.(png|jpe?g|webp|gif|avif)$/i, { message: "a reference is a picture: png, jpg, webp, gif or avif" })
		.refine((file) => !file.includes("/") && !file.includes("\\") && !file.includes(".."), {
			message: "a reference is a name inside the references folder, never a path",
		}),
	...ReferenceReadingSchema,
});

const ReferenceUrlSchema = z.object({
	url: z.url({ protocol: /^https$/, message: "a reference from the web is an https address" }),
	...ReferenceReadingSchema,
});

const ReferenceSchema = z.union([ReferenceFileSchema, ReferenceUrlSchema]);

const StateSchema = z.object({
	name: z.string().trim().min(1),
	file: ScreenFileSchema,
	situation: z.string().trim().min(1).optional(),
	size: FrameSizeSchema.optional(),
});

const ScreenSchema = z
	.object({
		name: z.string().trim().min(1),
		file: ScreenFileSchema.optional(),
		states: z.array(StateSchema).min(1).optional(),
	})
	.refine((screen) => (screen.file === undefined) !== (screen.states === undefined), {
		message: "a screen names one file, or its states, each with a file of its own",
	});

const DesignFieldsSchema = z.object({
	screens: z.array(ScreenSchema).default([]),
	references: z.array(ReferenceSchema).default([]),
});

const DesignSchema = DesignFieldsSchema.refine((design) => design.screens.length + design.references.length > 0, {
	message: "a design shows at least one screen or one reference",
});

function screenWith(placed: unknown, { screen, state, file, situation, size }: ScreenPlacement): unknown {
	const name = state ?? screen;
	const others = statesHeldBy(placed, screen).filter((one) => Reflect.get(one, "name") !== name);
	const entry = {
		name,
		file,
		...(situation === undefined ? {} : { situation }),
		...(size === undefined ? {} : { size }),
	};
	const states = name === screen ? [entry, ...others] : [...others, entry];
	const [only] = states;
	const isPlain =
		states.length === 1 &&
		only !== undefined &&
		Reflect.get(only, "name") === screen &&
		situation === undefined &&
		size === undefined;
	if (isPlain) return { name: screen, file };
	return { name: screen, states };
}

function statesHeldBy(placed: unknown, screen: string): object[] {
	if (typeof placed !== "object" || placed === null) return [];
	const states: unknown = Reflect.get(placed, "states");
	if (Array.isArray(states)) return states.filter((one): one is object => typeof one === "object" && one !== null);
	const file: unknown = Reflect.get(placed, "file");
	return typeof file === "string" ? [{ name: screen, file }] : [];
}

function typedOf(value: string): string | number | boolean {
	if (value === "true" || value === "false") return value === "true";
	return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
}
function isNamedReference(held: unknown, named: string): boolean {
	if (typeof held !== "object" || held === null) return false;
	const name: unknown = Reflect.get(held, "url") ?? Reflect.get(held, "file");
	return typeof name === "string" && (name === named || name.endsWith(named));
}

function listIn(held: object, key: string): unknown[] {
	const kept: unknown = Reflect.get(held, key);
	return Array.isArray(kept) ? kept : [];
}
