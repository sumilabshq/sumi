import { ICommand } from "@widgetarium/core";
import { LookPickSchema } from "../../schemas/look.schema.js";
import type { LookPick } from "../../schemas/look.schema.js";
import { sourceChanged } from "../design/design-reads.js";
import type { DesignSource } from "../design/design-source.js";

export class PickLookCommand extends ICommand.input(LookPickSchema) {
	constructor(
		private readonly source: DesignSource,
		private readonly app: string,
	) {
		super();
	}

	async run({ settingName, option }: LookPick): Promise<void> {
		await this.source.pickLook(this.app, settingName, option);
		sourceChanged(this.source, this.app);
	}
}
