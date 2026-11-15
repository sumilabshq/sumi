import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { z } from "zod";
import { settledOf, settling } from "../../shared/lib/settling/settling.js";
import { essentialCopiesClosed } from "../../shared/lib/tabs/window-moves.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { CloseEssentialAskSchema, SettleAskSchema, TabAskSchema } from "../../shared/schema/tab-asks.schema.js";
import {
	closeEssentialPlan,
	closeGroupPlan,
	closeOthersPlan,
	closeShownPlan,
	closeTabPlan,
} from "./lib/closing-plans.js";

export const closeTab = command()
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), closeTabPlan(id)))),
	);

export const closeOthers = command()
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), closeOthersPlan(id)))),
	);

export const closeShown = command()
	.public()
	.input(SettleAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), closeShownPlan()))),
	);

export const closeGroup = command()
	.public()
	.input(TabAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, id }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), closeGroupPlan(id)))),
	);

export const closeEssential = command()
	.public()
	.input(CloseEssentialAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, essentialId }, { tabs, placedApps }) =>
		settledOf(await tabs.movePlacedTabs(settling(at, placedApps.placedApps(), closeEssentialPlan(essentialId)))),
	);

export const closeEssentialCopies = command()
	.public()
	.input(z.object({ essentialId: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.handle(async ({ essentialId }, { tabs, placedApps }) => {
		await tabs.movePlacedTabs((placed) => {
			const moved = essentialCopiesClosed(essentialId, placedApps.placedApps())(placed);
			console.info(`[widgetarium] ${moved.next === null ? `close essential copies skipped: ${moved.reason}` : moved.reason}`);
			return moved;
		});
	});
