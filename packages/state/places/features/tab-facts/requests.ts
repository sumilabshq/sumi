import { Repeatable, command } from "@widgetarium/core/requests";
import { TabsGateway } from "../../gateways/tabs/tabs.gateway.js";
import { answered, moving } from "../../shared/lib/settling/settling.js";
import {
	KeepChatTabsAskSchema,
	SeenTabSchema,
	TabTurnMarksSchema,
	TabTurnSchema,
} from "../../shared/schema/tab-facts.schema.js";
import { forgetRunningTurnsPlan, keepChatTabsPlan, markSeenPlan, recordTurnPlan } from "./lib/fact-plans.js";

export const KeepChatTabsCommand = command("keep-chat-tabs")
	.input(KeepChatTabsAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ chats }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, keepChatTabsPlan(chats))));
	});

export const RecordTabTurnCommand = command("record-tab-turn")
	.input(TabTurnSchema)
	.output(TabTurnMarksSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async (turn, { tabs }) => {
		const marks = answered(await tabs.movePlacedTabs(moving(null, recordTurnPlan(turn))));

		if (marks.was === null) {
			console.info(`[widgetarium] turn of ${turn.id} kept nowhere: no open tab holds it`);
		}

		return marks;
	});

export const MarkTabSeenCommand = command("mark-tab-seen")
	.input(SeenTabSchema)
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async ({ id }, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, markSeenPlan(id))));
	});

export const ForgetRunningTurnsCommand = command("forget-running-turns")
	.idempotencyKey(Repeatable)
	.inject({ tabs: TabsGateway })
	.handle(async (_input, { tabs }) => {
		answered(await tabs.movePlacedTabs(moving(null, forgetRunningTurnsPlan())));
	});
