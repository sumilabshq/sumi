import { z } from "zod";
import { AppKindSchema } from "./app-tab.schema.js";

export const StudioViewSchema = z.union([z.literal("app"), AppKindSchema]);

export type StudioView = z.infer<typeof StudioViewSchema>;
