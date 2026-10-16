import { NOT_AVAILABLE_ON_HOST } from "@widgetarium/core/engine/studio-host.js";

export function notAvailable(): Promise<never> {
	return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
}
