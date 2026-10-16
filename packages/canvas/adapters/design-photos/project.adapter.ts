import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { DesignPhotos } from "./design-photos.adapter.js";

export class ProjectDesignPhotos extends DesignPhotos {
	override exists(): Promise<boolean> {
		return notAvailable();
	}

	override makeFolder(): Promise<void> {
		return notAvailable();
	}

	override writePhoto(): Promise<void> {
		return notAvailable();
	}

	override writeText(): Promise<void> {
		return notAvailable();
	}

	override changeText(): Promise<void> {
		return notAvailable();
	}
}

function notAvailable(): Promise<never> {
	return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
}
