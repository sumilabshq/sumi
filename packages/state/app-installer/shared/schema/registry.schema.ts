import { z } from "zod";
import { AppIdSchema, AppVersionNumberSchema } from "./installed.schema.js";

export const AppSourceSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("github"),
		repository: z.string().min(1),
	}),
	z.object({
		kind: z.literal("folder"),
		path: z.string().min(1),
	}),
]);

export type AppSource = z.infer<typeof AppSourceSchema>;

export const RegistryRowSchema = z.object({
	id: AppIdSchema,
	source: AppSourceSchema,
});

export type RegistryRow = z.infer<typeof RegistryRowSchema>;

export const RegistryFileSchema = z.object({
	apps: z.array(RegistryRowSchema).default([]),
});

export const AppRegistrySchema = z.object({
	apps: z.array(RegistryRowSchema),
	problem: z.string().nullable(),
});

export type AppRegistry = z.infer<typeof AppRegistrySchema>;

export const ReleaseFileSchema = z
	.object({
		app: AppIdSchema,
		version: AppVersionNumberSchema,
		files: z.array(
			z
				.object({
					path: z.string().min(1),
					sha256: z.string().regex(/^[0-9a-f]{64}$/),
					size: z.number().int().min(0),
				})
				.strict(),
		),
	})
	.strict();

export type ReleaseFile = z.infer<typeof ReleaseFileSchema>;
