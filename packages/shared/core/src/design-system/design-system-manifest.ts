import { z } from "zod";

const DESIGN_SYSTEM_SCHEMA_VERSION = "od-design-system-project/v1";
export const DESIGN_SYSTEM_MANIFEST_FILE = "manifest.json";

const FitValuesSchema = z.array(z.string().min(1)).min(1);

const PreviewPageSchema = z.strictObject({
	path: z.string().min(1),
	role: z.string().min(1),
	title: z.string().min(1),
});

export const DesignSystemManifestSchema = z.strictObject({
	schemaVersion: z.literal(DESIGN_SYSTEM_SCHEMA_VERSION),
	id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
	name: z.string().min(1),
	category: z.string().min(1),
	description: z.string().min(1),
	source: z.strictObject({
		type: z.string().min(1),
		origin: z.string().min(1),
		credit: z.string().optional(),
	}),
	files: z.strictObject({
		design: z.string().min(1),
		tokens: z.string().min(1),
		settings: z.string().min(1).optional(),
	}),
	usage: z.string().min(1).optional(),
	fit: z.strictObject({
		centre: FitValuesSchema,
		activity: FitValuesSchema,
		photogenic: FitValuesSchema,
		session: FitValuesSchema,
		density: FitValuesSchema,
		tone: FitValuesSchema,
		device: FitValuesSchema,
	}),
	preview: z
		.strictObject({
			dir: z.string().min(1),
			pages: z.array(PreviewPageSchema),
		})
		.optional(),
});

export type DesignSystemManifest = z.output<typeof DesignSystemManifestSchema>;

export function filesNamedBy(manifest: DesignSystemManifest): string[] {
	const optional = [manifest.files.settings, manifest.usage].filter((path) => path !== undefined);
	const previews = manifest.preview?.pages.map((page) => page.path) ?? [];
	return [manifest.files.design, manifest.files.tokens, ...optional, ...previews];
}
