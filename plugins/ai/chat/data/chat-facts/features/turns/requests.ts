import { Repeatable, deny, guard } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, moving } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import {
	ChatTurnMarksSchema,
	ChatTurnSchema,
	KeepChatTabsAskSchema,
	SeenChatSchema,
} from "../../shared/schema/chat-facts.schema.js";
import { forgetRunningTurnsPlan, keepChatTabsPlan, markSeenPlan, recordTurnPlan } from "./lib/turn-plans.js";

const NOT_FOR_APPS = "{request} is not open to apps: a chat's tab facts are the studio's own";

export const StudioCallersGuard = guard().handle(({ request, context }) => {
	if (context.user !== null) {
		deny(NOT_FOR_APPS.replace("{request}", request));
	}
});

export const keepChatTabs = command()
	.public()
	.input(KeepChatTabsAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ chats }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), keepChatTabsPlan(chats))));
	});

export const recordTurn = command()
	.public()
	.input(ChatTurnSchema)
	.output(ChatTurnMarksSchema)
	.idempotencyKey(Repeatable)
	.handle(async (turn, { tabs, placedApps }) => {
		const marks = answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), recordTurnPlan(turn))));

		if (marks.was === null) {
			console.info(`[widgetarium] turn of ${turn.id} kept nowhere: no open tab holds it`);
		}

		return marks;
	});

export const markSeen = command()
	.public()
	.input(SeenChatSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id }, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), markSeenPlan(id))));
	});

export const forgetRunningTurns = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle(async (_input, { tabs, placedApps }) => {
		answered(await tabs.movePlacedTabs(moving(null, placedApps.placedApps(), forgetRunningTurnsPlan())));
	});
