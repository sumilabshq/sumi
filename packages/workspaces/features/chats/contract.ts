import { z } from "zod";
import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import { ChatCrumbSchema, ChatListSchema } from "../../shared/schema/chat.schema.js";

const ChatIdSchema = z.object({ id: z.string().min(1) });

export const ChatListQuery = query("workspaces/chat-list").output(ChatListSchema).settlesNow();

export const ChatCrumbQuery = query("workspaces/chat-crumb").output(ChatCrumbSchema).settlesNow();

export const CreateChatCommand = command("workspaces/create-chat")
	.idempotencyKey(PerCall)
	.invalidates([ChatListQuery, ChatCrumbQuery]);

export const SelectChatCommand = command("workspaces/select-chat")
	.input(ChatIdSchema)
	.idempotencyKey(Repeatable)
	.invalidates([ChatListQuery, ChatCrumbQuery]);

export const PinChatCommand = command("workspaces/pin-chat")
	.input(ChatIdSchema.extend({ isPinned: z.boolean() }))
	.idempotencyKey(Repeatable)
	.invalidates([ChatListQuery, ChatCrumbQuery]);

export const RenameChatCommand = command("workspaces/rename-chat")
	.input(ChatIdSchema.extend({ title: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([ChatListQuery, ChatCrumbQuery]);
