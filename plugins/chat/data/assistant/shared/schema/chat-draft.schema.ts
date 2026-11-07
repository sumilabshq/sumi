import { z } from "zod";
import { ChatKeySchema } from "./chat-key.schema.js";
import type { DraftAttachment } from "./attachment.schema.js";
import type { ClaudeOptions } from "./claude-options.schema.js";

export const DraftTextSchema = z.object({ said: z.string() });

export const DraftNoticeSchema = z.object({ notice: z.string().nullable() });

export const OpenedDraftSchema = DraftTextSchema.extend(DraftNoticeSchema.shape);

export const HeldDraftTextSchema = ChatKeySchema.extend({ said: z.string() });

export const ChatOpenedSchema = z.object({ chat: z.string().min(1).max(200) });

export type ClaudeChoices = Pick<ClaudeOptions, "mode" | "model" | "effort">;

export interface ChatDraft {
	readonly said: string;
	readonly attachments: readonly DraftAttachment[];
	readonly choices: ClaudeChoices | null;
	readonly provider: string | null;
}
