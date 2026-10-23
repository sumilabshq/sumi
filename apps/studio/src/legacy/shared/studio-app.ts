import { z } from "zod";

export const StudioAppSchema = z.object({
	id: z.string(),
	name: z.string(),
	line: z.string().default(""),
	notice: z.string().default(""),
});

export type StudioApp = z.infer<typeof StudioAppSchema>;

export const NothingAskedSchema = z.object({});

export const NOTHING_ASKED = {};

export const DRAFT_APP: StudioApp = {
	id: "new-app",
	name: "Default workspace",
	line: "Not created yet",
	notice: "",
};

export function markLetterOf(app: StudioApp): string {
	return (Array.from(app.name)[0] ?? "").toUpperCase();
}
