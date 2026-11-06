import { z } from "zod";

export const PROFILE_FILE = "sumi.profile.json";

export const PluginIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*$/, "a plugin id is lowercase letters, digits and dashes, starting with a letter");

export const SumiProfileSchema = z.strictObject({
	plugins: z.array(PluginIdSchema),
	locked: z.array(PluginIdSchema).default([]),
});

export type SumiProfile = z.infer<typeof SumiProfileSchema>;

export function profileRefusalsOf(installed: readonly { readonly id: string }[], profile: SumiProfile): string[] {
	const installedIds = installed.map((each) => each.id);
	const known = new Set(installedIds);
	const enabled = new Set(profile.plugins);

	return [
		...repeatedIdsOf(installedIds).map((id) => `two installed plugins are both named ${id}`),
		...repeatedIdsOf(profile.plugins).map((id) => `${PROFILE_FILE} lists plugin ${id} twice`),
		...profile.plugins
			.filter((id) => !known.has(id))
			.map((id) => `${PROFILE_FILE} lists plugin ${id}, which is not installed`),
		...profile.locked
			.filter((id) => !enabled.has(id))
			.map((id) => `${PROFILE_FILE} locks plugin ${id}, which it does not enable: a locked plugin cannot be disabled`),
	];
}

function repeatedIdsOf(ids: readonly string[]): string[] {
	return [...new Set(ids.filter((id, at) => ids.indexOf(id) !== at))];
}
