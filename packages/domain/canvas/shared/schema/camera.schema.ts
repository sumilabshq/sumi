import { z } from "zod";

export const CameraSchema = z.object({
	x: z.number(),
	y: z.number(),
	scale: z.number(),
});

export const CameraAnswerSchema = z.object({ camera: CameraSchema.nullable() });

export const CameraKeptSchema = z.object({ camera: CameraSchema });

export type Camera = z.output<typeof CameraSchema>;
