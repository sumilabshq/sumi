import { z } from "zod";

// TODO: import from @sumi/contract once it exports its app id and version rules
export const AppIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*$/, "an app id is lowercase letters, digits and dashes, starting with a letter");

// TODO: import from @sumi/contract once it exports its app id and version rules
export const AppVersionNumberSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "a version is major.minor.patch");

export const VersionsRowSchema = z
	.object({
		current: AppVersionNumberSchema.nullable(),
		previous: AppVersionNumberSchema.nullable(),
		failed: z.array(AppVersionNumberSchema),
		versions: z.array(AppVersionNumberSchema),
	})
	.strict();

export type VersionsRow = z.infer<typeof VersionsRowSchema>;

export const VersionMoveSchema = z
	.object({
		was: VersionsRowSchema,
		now: VersionsRowSchema,
	})
	.strict();

export type VersionMove = z.infer<typeof VersionMoveSchema>;

export const InstalledFaceSchema = z.object({
	name: z.string(),
	version: AppVersionNumberSchema,
	pageUrl: z.string(),
});

export type InstalledFace = z.infer<typeof InstalledFaceSchema>;

export const InstalledAppSchema = z.object({
	id: AppIdSchema,
	current: AppVersionNumberSchema.nullable(),
	previous: AppVersionNumberSchema.nullable(),
	failed: z.array(AppVersionNumberSchema),
	versions: z.array(AppVersionNumberSchema),
	face: InstalledFaceSchema.nullable(),
	problem: z.string().nullable(),
});

export type InstalledApp = z.infer<typeof InstalledAppSchema>;

export const InstalledAppsSchema = z.object({
	apps: z.array(InstalledAppSchema),
});

export type InstalledApps = z.infer<typeof InstalledAppsSchema>;

export const AppIdAskSchema = z.object({
	id: AppIdSchema,
});

export const AppVersionSchema = z
	.object({
		id: AppIdSchema,
		version: AppVersionNumberSchema,
	})
	.strict();

export type AppVersion = z.infer<typeof AppVersionSchema>;

export const AppRefusalSchema = z.object({
	id: AppIdSchema,
	reason: z.string(),
});

export const AppUpdatesSchema = z.object({
	switched: z.array(AppVersionSchema),
	refusals: z.array(AppRefusalSchema),
});

export type AppUpdates = z.infer<typeof AppUpdatesSchema>;
