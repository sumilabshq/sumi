import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { answered, isRefusal, moving, settledOf, settling } from "../../shared/lib/settling/settling.js";
import { TabsSettledSchema } from "../../shared/schema/screen.schema.js";
import { WorkspaceMoveAskSchema } from "../../shared/schema/tab-asks.schema.js";
import { arrivalPlan, carriedAt, departurePlan, refuseWorkspaceMove, withdrawalPlan } from "./lib/move-plans.js";

export const move = command()
	.public()
	.input(WorkspaceMoveAskSchema)
	.output(TabsSettledSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ at, entry, workspace }, { tabs, placedApps }) => {
		const from = tabs.workspaceId();
		const apps = placedApps.placedApps();
		const refusal = refuseWorkspaceMove(entry, from, workspace);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const carried = carriedAt(await tabs.placedTabs(), at, apps, entry);

		if (isRefusal(carried)) {
			return refuse(carried.refusal);
		}

		const arrived = answered(await tabs.movePlacedTabsIn(workspace, moving(null, apps, arrivalPlan(carried, from))));
		const departed = await tabs.movePlacedTabs(settling(at, apps, departurePlan(carried, workspace)));

		if (!departed.isRefused) {
			return settledOf(departed);
		}

		const reason = `${arrived.entry.kind} ${arrived.entry.id} → none, taken back: workspace ${from} kept ${entry.id} (${departed.reason})`;
		console.warn(`[widgetarium] workspace ${workspace} ${reason}`);
		const withdrawn = await tabs.movePlacedTabsIn(workspace, moving(null, apps, withdrawalPlan(arrived, reason)));

		if (withdrawn.isRefused) {
			console.error(
				`[widgetarium] workspace ${workspace} keeps ${arrived.entry.id} beside ${entry.id} of workspace ${from}: it could not be taken back (${withdrawn.reason})`,
			);
		}

		return refuse(departed.reason);
	});
