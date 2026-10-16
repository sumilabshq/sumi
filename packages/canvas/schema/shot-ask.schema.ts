import { z } from "zod";

export const ShotAskSchema = z.object({ page: z.string(), frame: z.string() });
