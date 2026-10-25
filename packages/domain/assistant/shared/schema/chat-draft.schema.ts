import { z } from "zod";

export const DraftTextSchema = z.object({ said: z.string() });

export const ChatOpenedSchema = z.object({ chatId: z.string().min(1) });
