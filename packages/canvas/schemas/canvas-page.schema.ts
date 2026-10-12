import { z } from "zod";

export const DOCS_PAGE = "Docs";
export const REFERENCES_PAGE = "References";
export const COMPONENTS_PAGE = "Components";
export const PAGES = "Pages";

export const CanvasPagesSchema = z.object({
	leading: z.array(z.string()).readonly(),
	screens: z.array(z.string()).readonly(),
	trailing: z.array(z.string()).readonly(),
	shown: z.string(),
	running: z.record(z.string(), z.string()),
	shownScreens: z.array(z.string()).readonly(),
	variants: z.array(z.object({ screen: z.string(), letter: z.string().nullable() })).readonly(),
});

export type CanvasPages = z.output<typeof CanvasPagesSchema>;
