import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { DesignFiles } from "./design-files.adapter.js";

export class WebDesignFiles extends DesignFiles {
	override async read(): Promise<null> {
		return null;
	}

	override exists(): Promise<boolean> {
		return notAvailable();
	}

	override makeFolder(): Promise<void> {
		return notAvailable();
	}

	override writeBinary(): Promise<void> {
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
