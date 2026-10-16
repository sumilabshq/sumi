import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { DesignLayers } from "./design-layers.adapter.js";

export class ProjectDesignLayers extends DesignLayers {
	override change(): Promise<void> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}
}
