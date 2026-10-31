import { z } from "zod";
import { RANGE_PATTERN, VERSION_PATTERN } from "./version.js";

export const APP_MANIFEST_FILE = "sumi-app.json";

export const AppIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*$/, "an app id is lowercase letters, digits and dashes, starting with a letter");

export const AppModuleSchema = z.object({
	name: z.string().min(1),
	runs: z.enum(["page", "background"]),
});

export type AppModule = z.infer<typeof AppModuleSchema>;

export const AppManifestSchema = z.object({
	id: AppIdSchema,
	name: z.string().min(1),
	version: z.string().regex(VERSION_PATTERN, "a version is major.minor.patch"),
	contract: z.string().regex(RANGE_PATTERN, "a contract range is ^major.minor"),
	ui: z.string().min(1),
	modules: z.array(AppModuleSchema).default([]),
	mcp: z.boolean().default(false),
	navigates: z.boolean().default(false),
});

export type AppManifest = z.infer<typeof AppManifestSchema>;

export function defineApp(manifest: z.input<typeof AppManifestSchema>): AppManifest {
	return AppManifestSchema.parse(manifest);
}
