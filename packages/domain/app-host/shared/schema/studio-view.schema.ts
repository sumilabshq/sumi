import { z } from "zod";

export const StudioViewSchema = z.enum(["app", "canvas", "browser"]);

export type StudioView = z.infer<typeof StudioViewSchema>;
