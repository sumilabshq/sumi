import { z } from "zod";
import { designFolderOf } from "./app-design.js";
import { issueSaidOf, jsonOf } from "./json-text.js";
import type { Parsed } from "./json-text.js";

const THE_LOOK = "look.json";
const THE_SETTINGS = "settings.json";
const NO_SETTING = 'the look of this app has no setting "{name}"';
const NO_OPTION = '"{option}" is not an option of {name}: {options}';
const NOTHING_OFFERED = "settings.json offers no setting with a list of options";
const RECOMMENDED_IS_AN_OPTION = "the recommended option must be one of the options";
const PICKED_IS_AN_OPTION = "the picked option must be one of the options";

export type Look = z.infer<typeof LookSchema>;

export type LookSetting = Look["settings"][number];

export type OfferedSetting = z.infer<typeof OfferedSettingSchema>;

export function lookPathOf(app: string): string {
	return `${designFolderOf(app)}/${THE_LOOK}`;
}

export function readLook(text: string): Parsed<Look> {
	const held = jsonOf(text, THE_LOOK);
	if (held.refusal !== undefined) return held;
	const parsed = LookSchema.safeParse(held.value);
	return parsed.success ? { value: parsed.data } : { refusal: issueSaidOf(parsed.error, THE_LOOK) };
}

export function readSystemSettings(text: string): Parsed<OfferedSetting[]> {
	const held = jsonOf(text, THE_SETTINGS);
	if (held.refusal !== undefined) return held;
	const parsed = SystemSettingsSchema.safeParse(held.value);
	if (!parsed.success) return { refusal: issueSaidOf(parsed.error, THE_SETTINGS) };
	const listed = parsed.data.settings.filter((entry) => Array.isArray(entry.options));
	const offered: OfferedSetting[] = [];
	for (const { default: recommended, ...entry } of listed) {
		const one = offeredSettingOf({ ...entry, recommended });
		if (one.refusal !== undefined) return { refusal: `${entry.name}: ${one.refusal}` };
		offered.push(one.value);
	}
	return offered.length > 0 ? { value: offered } : { refusal: NOTHING_OFFERED };
}

export function offeredSettingOf(candidate: unknown): Parsed<OfferedSetting> {
	const parsed = OfferedSettingSchema.safeParse(candidate);
	return parsed.success ? { value: parsed.data } : { refusal: issueSaidOf(parsed.error, "the setting") };
}

export function withSettingsOffered(was: Look | null, system: string, offered: readonly OfferedSetting[]): Look {
	const pickedBefore = new Map((was?.system === system ? was.settings : []).map((one) => [one.name, one.picked]));
	return {
		system,
		settings: offered.map((setting) => ({
			...setting,
			picked: setting.options.find((option) => option === pickedBefore.get(setting.name)) ?? setting.recommended,
		})),
	};
}

export function withOptionPicked(look: Look, name: string, option: string): Parsed<Look> {
	const setting = look.settings.find((one) => one.name === name);
	if (!setting) return { refusal: NO_SETTING.replace("{name}", name) };
	if (!setting.options.includes(option))
		return {
			refusal: NO_OPTION.replace("{option}", option)
				.replace("{name}", name)
				.replace("{options}", setting.options.join(", ")),
		};
	return {
		value: { ...look, settings: look.settings.map((one) => (one.name === name ? { ...one, picked: option } : one)) },
	};
}

export function lookToWrite(look: Look): string {
	return `${JSON.stringify(look, null, "\t")}\n`;
}

const SettingFieldsSchema = z.object({
	name: z.string().min(1),
	ask: z.string().optional(),
	options: z.array(z.string().min(1)).min(2),
	recommended: z.string(),
});

const OfferedSettingSchema = SettingFieldsSchema.refine((setting) => setting.options.includes(setting.recommended), {
	message: RECOMMENDED_IS_AN_OPTION,
});

const LookSettingSchema = SettingFieldsSchema.extend({ picked: z.string() })
	.refine((setting) => setting.options.includes(setting.recommended), { message: RECOMMENDED_IS_AN_OPTION })
	.refine((setting) => setting.options.includes(setting.picked), { message: PICKED_IS_AN_OPTION });

const LookSchema = z.object({ system: z.string().min(1), settings: z.array(LookSettingSchema) });

const SystemSettingsSchema = z.object({
	settings: z.array(
		z.object({
			name: z.string().min(1),
			ask: z.string().optional(),
			options: z.union([z.array(z.string()), z.string()]),
			default: z.string().optional(),
		}),
	),
});
