import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";
import { AppLook } from "./app-look.adapter.js";

export class ProjectAppLook extends AppLook {
	override async read(): Promise<null> {
		return null;
	}

	override change(): Promise<boolean> {
		return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
	}
}
