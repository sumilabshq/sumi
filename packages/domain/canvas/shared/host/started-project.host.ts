import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";

export const StartedProjectHost = hostObject<StartedProject>("StartedProject", isStartedProject);

function isStartedProject(held: unknown): held is StartedProject {
	return (
		isObject(held) &&
		Array.isArray(held["routes"]) &&
		isObject(held["registry"]) &&
		typeof held["hostOf"] === "function"
	);
}
