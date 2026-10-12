import { z } from "zod";

export const FrameSizeSchema = z.object({ width: z.number(), height: z.number() });

export type FrameSize = z.output<typeof FrameSizeSchema>;

export const DESKTOP_FRAME: FrameSize = { width: 1280, height: 832 };
