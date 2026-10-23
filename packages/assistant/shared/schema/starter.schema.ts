import { z } from "zod";

export const StarterSchema = z.enum(["create", "design"]);

export type Starter = z.infer<typeof StarterSchema>;

export const StarterAskedSchema = z.object({ starter: StarterSchema });
