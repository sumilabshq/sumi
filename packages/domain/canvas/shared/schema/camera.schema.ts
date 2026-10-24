import { z } from "zod";

export const CameraSchema = z.object({ x: z.number(), y: z.number(), scale: z.number() });

export type Camera = z.output<typeof CameraSchema>;
