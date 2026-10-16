import { handler, refuse } from "@widgetarium/core/requests";
import { AppLook } from "../../adapters/app-look/app-look.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { lookTextPicked } from "../../lib/look/look-picked.js";
import type { LookTextPicked } from "../../lib/look/look-picked.js";
import { lookRowsOf } from "../../lib/look/look-rows.js";
import { lookSheetOf } from "../../lib/look/look-sheet.js";
import { fontsUrlOf } from "../../lib/look/look-tokens.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { LookPanelQuery, PickLookCommand } from "./contract.js";

const UNREADABLE = "The look cannot be read: {why}";
const NO_LOOK = "{app} has no look to change yet: the assistant offers it first.";

export const lookPanelHandler = handler(LookPanelQuery, {
	inject: { designReads: DesignReads, canvasStore: CanvasStore },
	run: async (_input, { designReads, canvasStore }) => {
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
	},
	watch: (_input, { designReads, canvasStore }, changed) => designReads.watch(canvasStore.now().app, changed),
});

export const pickLookHandler = handler(PickLookCommand, {
	inject: { designReads: DesignReads, appLook: AppLook, canvasStore: CanvasStore },
	run: async ({ settingName, option }, { designReads, appLook, canvasStore }) => {
		const { app } = canvasStore.now();
		const isChanged = await appLook.change(app, (text) => pickedOrRefused(lookTextPicked(text, settingName, option)));
		if (!isChanged) refuse(NO_LOOK.replace("{app}", app));
		designReads.changed(app);
	},
});

function pickedOrRefused(picked: LookTextPicked): string {
	return "refusal" in picked ? refuse(picked.refusal) : picked.text;
}
