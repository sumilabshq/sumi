import { z } from "zod";

export const ChatTabStateSchema = z.enum(["idle", "working", "done", "failed"]);

export type ChatTabState = z.infer<typeof ChatTabStateSchema>;
