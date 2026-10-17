import { z } from "zod";

const FilesSchema = z.record(z.string(), z.string());

const SystemSeedSchema = z.strictObject({
	usage: z.string(),
	design: z.string(),
	tokens: z.string(),
});

const EnginePackageSchema = z.strictObject({
	name: z.string().min(1),
	file: z.string().min(1),
});

export const ProjectSeedSchema = z.strictObject({
	templates: FilesSchema,
	kit: FilesSchema,
	kitEntries: FilesSchema,
	handbook: FilesSchema,
	systems: z.record(z.string(), SystemSeedSchema),
	engine: z.array(EnginePackageSchema),
});

export type ProjectSeed = z.output<typeof ProjectSeedSchema>;
export type DesignSystemSeed = z.output<typeof SystemSeedSchema>;
export type EnginePackage = z.output<typeof EnginePackageSchema>;
