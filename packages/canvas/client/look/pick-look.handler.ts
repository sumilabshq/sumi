import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { PickLookCommand } from "../../requests/pick-look.command.js";

export class PickLookCommandHandler extends handlerOf(PickLookCommand) {
	private readonly designReads = this.inject(DesignReads);
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ settingName, option }: InputOf<typeof PickLookCommand>): Promise<void> {
		const { app } = this.canvasStore.now();
		await this.designSource.pickLook(app, settingName, option);
		this.designReads.changed(app);
	}
}
