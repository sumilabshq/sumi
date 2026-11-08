import { z } from "zod";

export const PROFILE_FILE = "sumi.profile.json";

export const PluginIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*$/, "a plugin id is lowercase letters, digits and dashes, starting with a letter");

export const SumiProfileSchema = z.strictObject({
	plugins: z.array(PluginIdSchema),
});

export type SumiProfile = z.infer<typeof SumiProfileSchema>;
