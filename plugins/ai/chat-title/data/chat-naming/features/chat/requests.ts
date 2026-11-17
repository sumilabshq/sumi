import { AuthenticatedGuard, Repeatable } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";
import { command } from "#module";
import { ChatRenameAnswerSchema, ChatRenameAskedSchema } from "../../shared/schema/chat-naming.schema.js";

const RENAMED = "Renamed this chat to {title}.";
const KEPT = "The person named this chat, so its name stays.";

export const rename = command()
	.public()
	.metadata({
		description:
			"Rename this chat when its subject clearly changed from what its name says. Rarely: never twice in a row, never for a side question. A name the person gave stays, the call answers so.",
	})
	.input(ChatRenameAskedSchema)
	.output(ChatRenameAnswerSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async ({ title }, { user, send }) => {
		const { isRenamed } = await send(workspaces.chats.renameChat, {
			id: user.id,
			title,
			by: "auto",
		});
		return {
			isRenamed,
			said: isRenamed ? RENAMED.replace("{title}", title) : KEPT,
		};
	});
