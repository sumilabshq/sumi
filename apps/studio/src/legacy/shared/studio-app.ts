import { z } from "zod";

export const StudioAppSchema = z.object({
	id: z.string(),
	name: z.string(),
	line: z.string().default(""),
});

export type StudioApp = z.infer<typeof StudioAppSchema>;

export const AppAskedSchema = z.object({ id: z.string() });

const NAME_STARTS_WITH_DOT = "a workspace name cannot start with a dot";

export const AppRenamedSchema = z.object({
	id: z.string(),
	name: z
		.string()
		.trim()
		.min(1)
		.refine((name) => !name.startsWith("."), NAME_STARTS_WITH_DOT),
});

export const NothingAskedSchema = z.object({});

export const NOTHING_ASKED = {};

export const DRAFT_APP: StudioApp = {
	id: "new-app",
	name: "Default workspace",
	line: "Not created yet",
};

export function markLetterOf(app: StudioApp): string {
	return (Array.from(app.name)[0] ?? "").toUpperCase();
}
