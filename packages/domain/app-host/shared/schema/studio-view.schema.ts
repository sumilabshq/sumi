import { z } from "zod";

export const StudioViewSchema = z.enum(["app", "canvas", "browser", "terminal"]);

export type StudioView = z.infer<typeof StudioViewSchema>;
