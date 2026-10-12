import { z } from "zod";

export const LookSettingSchema = z.object({
	name: z.string(),
	ask: z.string().optional(),
	options: z.array(z.string()).readonly(),
	recommended: z.string(),
	picked: z.string(),
});

export const LookSchema = z.object({ system: z.string(), settings: z.array(LookSettingSchema).readonly() });

export const LookReadSchema = z.union([z.object({ value: LookSchema }), z.object({ refusal: z.string() })]);

export const LookPickSchema = z.object({ settingName: z.string(), option: z.string() });

export type Look = z.output<typeof LookSchema>;
export type LookSetting = z.output<typeof LookSettingSchema>;
export type LookRead = z.output<typeof LookReadSchema>;
export type LookPick = z.output<typeof LookPickSchema>;
