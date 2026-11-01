import { z } from "zod";

export const SchemeSchema = z.enum(["light", "dark"]);

export type Scheme = z.infer<typeof SchemeSchema>;

export const ThemeChoiceSchema = z.enum(["system", "light", "dark"]);

export type ThemeChoice = z.infer<typeof ThemeChoiceSchema>;

export const ThemeSchema = z.object({
	scheme: SchemeSchema,
	choice: ThemeChoiceSchema,
});

export type Theme = z.infer<typeof ThemeSchema>;

export const ChooseThemeInputSchema = z.object({
	choice: ThemeChoiceSchema,
});
