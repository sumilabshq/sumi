import { handler, refuse } from "@widgetarium/core/requests";
import { lookPathOf } from "@widgetarium/core/app-look.js";
import { DesignFilesGateway } from "../../gateways/design-files/design-files.gateway.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { lookTextPicked } from "./lib/look-picked.js";
import type { LookTextPicked } from "./lib/look-picked.js";
import { lookRowsOf } from "./lib/look-rows.js";
import { lookSheetOf } from "./lib/look-sheet.js";
import { fontsUrlOf } from "./lib/look-tokens.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { LookPanelQuery, PickLookCommand } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const UNREADABLE = "The look cannot be read: {why}";
const NO_LOOK = "{app} has no look to change yet: the assistant offers it first.";

export const LookPanelQueryHandler = handler(LookPanelQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => designReads.watch(canvasStore.now().app, changed))
	.handle(async (_input, { designReads, canvasStore }) => {
		const read = await designReads.look(canvasStore.now().app);
		if (!read) return { kind: "none" as const };
		if (read.refusal !== undefined)
			return { kind: "unreadable" as const, said: UNREADABLE.replace("{why}", read.refusal) };
		const look = read.value;
		return {
			kind: "look" as const,
			system: look.system,
			sheet: lookSheetOf(look),
			fontsUrl: fontsUrlOf(look),
			rows: lookRowsOf(look),
		};
	});

export const PickLookCommandHandler = handler(PickLookCommand, CanvasClientModule)
	.inject({ designReads: DesignReads, designFilesGateway: DesignFilesGateway, canvasStore: CanvasStore })
	.handle(async ({ settingName, option }, { designReads, designFilesGateway, canvasStore }) => {
		const { app } = canvasStore.now();
		const path = lookPathOf(app);
		if (!(await designFilesGateway.exists(path))) refuse(NO_LOOK.replace("{app}", app));
		await designFilesGateway.changeText(path, (text) => pickedOrRefused(lookTextPicked(text, settingName, option)));
		designReads.changed(app);
	});

function pickedOrRefused(picked: LookTextPicked): string {
	return "refusal" in picked ? refuse(picked.refusal) : picked.text;
}
