import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { Drawing, PictureTaker } from "../../schema/drawing.schema.js";
import { withBlocks } from "../../lib/design/design-block-registry.js";
import { pictureTakerOf } from "../../lib/pictures/off-screen.js";
import type { FetchUrl } from "../../lib/pictures/off-screen.js";
import { DesignDrawing } from "./design-drawing.adapter.js";

export class VaultDesignDrawing extends DesignDrawing {
	override readonly pictureOf: PictureTaker;
	private readonly drawn: Drawing;

	constructor(registry: WidgetRegistry, host: Drawing["host"], fetchUrl: FetchUrl) {
		super();
		this.pictureOf = pictureTakerOf(fetchUrl);
		this.drawn = { registry: withBlocks(registry), host };
	}

	override drawing(): Drawing {
		return this.drawn;
	}
}
