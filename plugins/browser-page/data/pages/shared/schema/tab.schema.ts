import { z } from "zod";

// TRADE-OFF: page shapes copied from the browser contract; the generator copies only local schemas.
export const ShotAreaSchema = z.enum(["viewport", "page"]);

export const PageRegionSchema = z.strictObject({
	x: z.number().int().min(0),
	y: z.number().int().min(0),
	width: z.number().int().min(1),
	height: z.number().int().min(1),
});

export const PageContentSchema = z.object({
	url: z.string(),
	title: z.string(),
	text: z.string(),
});

export const PageShotSchema = z.object({
	url: z.string(),
	png: z.string(),
	width: z.number(),
	height: z.number(),
	layout: z
		.object({
			page: z.object({ width: z.number(), height: z.number() }),
			viewport: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
		})
		.nullable(),
});

export const TabAskSchema = z.strictObject({ tabId: z.string().min(1) });

export const TabReadAskSchema = z.strictObject({
	tabId: z.string().min(1),
	as: z
		.enum(["text", "dom", "screenshot"])
		.default("text")
		.describe(
			"text (default) is what the page says; dom is its markup with scripts and styles left out and typed field values filled in; screenshot is a picture.",
		),
	area: ShotAreaSchema.optional().describe("Default viewport."),
	region: PageRegionSchema.optional(),
});

export const ReadWordSchema = z.enum(["allowed", "ask", "denied"]);

export type ReadWord = z.infer<typeof ReadWordSchema>;

export const TabAccessSchema = z.union([
	z.object({
		tabId: z.string(),
		accesses: z.null(),
		why: z.string(),
	}),
	z.object({
		tabId: z.string(),
		site: z.string(),
		accesses: z.object({ read: ReadWordSchema }),
		decision: z.enum(["allow", "ask", "deny"]),
		why: z.string(),
	}),
]);

export type TabAccess = z.infer<typeof TabAccessSchema>;

export const TabReadingSchema = z.union([PageContentSchema, PageShotSchema]);
