import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { StopJobCommand } from "../../requests/stop-job.command.js";

export class StopJobCommandHandler extends handlerOf(StopJobCommand) {
	private readonly designSource = this.inject(DesignSource);
	private readonly canvasStore = this.inject(CanvasStore);

	override async handle({ id }: InputOf<typeof StopJobCommand>): Promise<void> {
		await this.designSource.stopJob(this.canvasStore.now().app, id);
	}
}
