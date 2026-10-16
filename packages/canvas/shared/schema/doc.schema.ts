import { z } from "zod";

export const CanvasDocSchema = z.object({ name: z.string(), path: z.string(), markdown: z.string() });

export type CanvasDoc = z.output<typeof CanvasDocSchema>;
