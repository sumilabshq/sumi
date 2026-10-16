import { z } from "zod";

export const LookSettingSchema = z.object({
	name: z.string(),
	ask: z.string().optional(),
	options: z.array(z.string()).readonly(),
	recommended: z.string(),
	picked: z.string(),
});

export const LookSchema = z.object({ system: z.string(), settings: z.array(LookSettingSchema).readonly() });

export type Look = z.output<typeof LookSchema>;
export type LookSetting = z.output<typeof LookSettingSchema>;
