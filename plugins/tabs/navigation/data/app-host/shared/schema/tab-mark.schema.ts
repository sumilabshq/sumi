import { z } from "zod";

export const ChatMarkSchema = z.enum(["none", "running", "asking", "failed", "unread"]);

export type ChatMark = z.infer<typeof ChatMarkSchema>;
