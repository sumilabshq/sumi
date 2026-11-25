import { z } from "zod";

export const FontRoleSchema = z.enum(["heading", "ui", "code"]);

export type FontRole = z.infer<typeof FontRoleSchema>;

export const FontFamilySchema = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.regex(/^[A-Za-z0-9 .-]+$/);

export const KeptFontsSchema = z.object({
	heading: FontFamilySchema.nullable().catch(null),
	ui: FontFamilySchema.nullable().catch(null),
	code: FontFamilySchema.nullable().catch(null),
});

export type KeptFonts = z.infer<typeof KeptFontsSchema>;

export const NO_KEPT_FONTS: KeptFonts = { heading: null, ui: null, code: null };

export const FontChoiceSchema = z.object({
	family: FontFamilySchema,
	stack: z.string(),
});

export type FontChoice = z.infer<typeof FontChoiceSchema>;

export const FontRoleAnswerSchema = z.object({
	chosen: FontChoiceSchema,
	isDefault: z.boolean(),
	available: z.array(FontChoiceSchema),
});

export const FontsSchema = z.object({
	heading: FontRoleAnswerSchema,
	ui: FontRoleAnswerSchema,
	code: FontRoleAnswerSchema,
});

export type Fonts = z.infer<typeof FontsSchema>;

export const ChooseFontInputSchema = z.object({
	role: FontRoleSchema,
	family: FontFamilySchema.nullable(),
});
