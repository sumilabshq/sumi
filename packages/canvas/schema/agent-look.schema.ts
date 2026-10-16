import { z } from "zod";

const AgentLookSchema = z.object({ app: z.string(), page: z.string(), frame: z.string() });

export type AgentLook = z.output<typeof AgentLookSchema>;
