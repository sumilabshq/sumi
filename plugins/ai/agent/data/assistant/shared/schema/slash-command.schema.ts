import { z } from "zod";

export const SlashNameSchema = z.enum(["clear", "compact", "rename"]);

export type SlashName = z.infer<typeof SlashNameSchema>;

export const SlashNamesSchema = z.array(SlashNameSchema);
