import { z } from "zod";

export const FrameSizeSchema = z.object({
	width: z.number(),
	height: z.number(),
});

export type FrameSize = z.output<typeof FrameSizeSchema>;
