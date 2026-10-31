import { z } from "zod";

export const StudioViewSchema = z.enum(["app", "canvas", "browser", "terminal", "tasks"]);

export type StudioView = z.infer<typeof StudioViewSchema>;
