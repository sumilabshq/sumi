import { z } from "zod";

export const DesignAppSchema = z.object({ app: z.string() });
