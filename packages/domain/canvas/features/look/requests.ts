import { PerCall, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { lookPathOf } from "@widgetarium/core/app-look.js";
import { CanvasMomentChangedEvent } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { DesignChangedEvent } from "../../gateways/design-folder/design-folder.events.js";
import { LookPanelSchema, LookPickSchema } from "../../shared/schema/look-row.schema.js";
import { lookTextPicked } from "./lib/look-picked.js";
import type { LookTextPicked } from "./lib/look-picked.js";
import { lookRowsOf } from "./lib/look-rows.js";
import { lookSheetOf } from "./lib/look-sheet.js";
import { fontsUrlOf } from "./lib/look-tokens.js";

const UNREADABLE = "The look cannot be read: {why}";
const NO_LOOK = "{app} has no look to change yet: the assistant offers it first.";

export const LookPanelQuery = query("look-panel")
	.public()
	.output(LookPanelSchema)
	.handle(async (_input, { canvasMoment, designFolder }) => {
		const { look } = await designFolder.folder(canvasMoment.moment().app);

		if (!look) {
			return { kind: "none" as const };
		}

		if (look.refusal !== undefined) {
			return {
				kind: "unreadable" as const,
				said: UNREADABLE.replace("{why}", look.refusal),
			};
		}

		return {
			kind: "look" as const,
			system: look.value.system,
			sheet: lookSheetOf(look.value),
			fontsUrl: fontsUrlOf(look.value),
			rows: lookRowsOf(look.value),
		};
	});

export const PickLookCommand = command("pick-look")
	.public()
	.input(LookPickSchema)
	.idempotencyKey(PerCall)
	.emits(DesignChangedEvent)
	.handle(async ({ settingName, option }, { canvasMoment, designFolder, designFiles, emit }) => {
		const { app } = canvasMoment.moment();
		const path = lookPathOf(app);

		if (!(await designFiles.exists(path))) {
			return refuse(NO_LOOK.replace("{app}", app));
		}

		await designFiles.changeText(path, (text) => pickedOrRefused(lookTextPicked(text, settingName, option)));
		designFolder.forgetFolder(app);
		emit(DesignChangedEvent, { app });
		console.info(`[widgetarium] look of ${app}: ${settingName} → ${option} (picked)`);
	});

export const RereadLookSubscriber = subscriber(CanvasMomentChangedEvent).handle(({ fields }, { invalidate }) => {
	if (fields.includes("app")) {
		invalidate(LookPanelQuery);
	}
});

export const RereadLookForDesignSubscriber = subscriber(DesignChangedEvent).handle((_input, { invalidate }) => {
	invalidate(LookPanelQuery);
});

function pickedOrRefused(picked: LookTextPicked): string {
	return "refusal" in picked ? refuse(picked.refusal) : picked.text;
}
