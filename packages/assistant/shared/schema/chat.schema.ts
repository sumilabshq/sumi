import { z } from "zod";
import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type { AssistantSession, AssistantTurn, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { AttachmentChipSchema } from "./attachment.schema.js";

const SessionSchema = z.custom<AssistantSession>((value) => isObject(value) && Array.isArray(value["turns"]));

const CardsSchema = z.custom<ChatCards>((value) => isObject(value) && Array.isArray(value["ofTurns"]));

const TurnSchema = z.custom<AssistantTurn>((value) => isObject(value) && Array.isArray(value["calls"]));

const FaceSchema = z.custom<CallFace>((value) => isObject(value) && typeof value["kind"] === "string");

export const ShownTurnSchema = z.object({
	turn: TurnSchema,
	said: z.string(),
	faces: z.array(FaceSchema),
	attached: z.array(AttachmentChipSchema),
});

export type ShownTurn = z.infer<typeof ShownTurnSchema>;

export const ChatSchema = z.object({
	isAvailable: z.boolean(),
	session: SessionSchema,
	cards: CardsSchema,
	turns: z.array(ShownTurnSchema),
	runningFace: FaceSchema.nullable(),
	isAsking: z.boolean(),
});

export type Chat = z.infer<typeof ChatSchema>;
