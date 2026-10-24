import { Repeatable, command, query } from "@widgetarium/core/requests";
import { ChatSchema } from "../../shared/schema/chat.schema.js";

export const ChatQuery = query("assistant/chat").output(ChatSchema).settlesNow();

export const RetryTurnCommand = command("assistant/retry-turn").idempotencyKey(Repeatable).invalidates([]);

export const StopTurnCommand = command("assistant/stop-turn").idempotencyKey(Repeatable).invalidates([]);
