import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { ReturnedOf } from "@widgetarium/core/mediator";
import type { Look } from "../../schema/look.js";
import { DesignReads } from "../design/design-reads.js";
import { CanvasStore } from "../view/canvas-store.js";
import { lookSheetOf } from "./look-sheet.js";
import { fontsUrlOf, isSettingDrawnLive } from "./look-tokens.js";

const LookRowSchema = z.object({
	name: z.string(),
	label: z.string(),
	options: z.array(z.string()),
	picked: z.string(),
	isSegmented: z.boolean(),
	suggested: z.string().nullable(),
	isRedrawn: z.boolean(),
});

export const LookPanelQuery = query("canvas/look-panel").output(
	z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("none") }),
		z.object({ kind: z.literal("unreadable"), said: z.string() }),
		z.object({
			kind: z.literal("look"),
			system: z.string(),
			sheet: z.string(),
			fontsUrl: z.string().nullable(),
			rows: z.array(LookRowSchema),
		}),
	]),
);

const SEGMENTS_AT_MOST = 3;
const UNREADABLE = "The look cannot be read: {why}";
const SUGGESTED = "Suggested: {option}";

export class LookPanelQueryHandler extends handlerOf(LookPanelQuery) {
	private readonly designReads = inject(DesignReads);
	private readonly canvasStore = inject(CanvasStore);

	override async handle(): Promise<ReturnedOf<typeof LookPanelQuery>> {
		const read = await this.designReads.look(this.canvasStore.now().app);
		if (!read) return { kind: "none" };
		if (read.refusal !== undefined) return { kind: "unreadable", said: UNREADABLE.replace("{why}", read.refusal) };
		const look: Look = read.value;
		return {
			kind: "look",
			system: look.system,
			sheet: lookSheetOf(look),
			fontsUrl: fontsUrlOf(look),
			rows: look.settings.map((setting) => ({
				name: setting.name,
				label: setting.ask ?? setting.name,
				options: [...setting.options],
				picked: setting.picked,
				isSegmented: setting.options.length <= SEGMENTS_AT_MOST,
				suggested: setting.picked === setting.recommended ? null : SUGGESTED.replace("{option}", setting.recommended),
				isRedrawn: !isSettingDrawnLive(setting.name),
			})),
		};
	}

	watch(_input: void, changed: () => void): () => void {
		return this.designReads.watch(this.canvasStore.now().app, changed);
	}
}
