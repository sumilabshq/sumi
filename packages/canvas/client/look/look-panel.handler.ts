import { handlerOf } from "@widgetarium/core/mediator";
import type { Watching, ReturnedOf } from "@widgetarium/core/mediator";
import type { Look } from "../../schema/look.schema.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { lookSheetOf } from "../../lib/look/look-sheet.js";
import { fontsUrlOf, isSettingDrawnLive } from "../../lib/look/look-tokens.js";
import { LookPanelQuery } from "../../requests/look-panel.query.js";

const SEGMENTS_AT_MOST = 3;

const UNREADABLE = "The look cannot be read: {why}";

const SUGGESTED = "Suggested: {option}";

export class LookPanelQueryHandler extends handlerOf(LookPanelQuery) {
	private readonly designReads = this.inject(DesignReads);
	private readonly canvasStore = this.inject(CanvasStore);

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

	override watch({ changed }: Watching<typeof LookPanelQuery>): () => void {
		return this.designReads.watch(this.canvasStore.now().app, changed);
	}
}
