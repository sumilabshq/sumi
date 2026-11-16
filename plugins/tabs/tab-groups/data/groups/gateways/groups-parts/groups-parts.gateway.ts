import { MAIN_STUDIO_WINDOW, studioWindowOf } from "@widgetarium/behaviors";
import type { ConfigFacts } from "@widgetarium/data-framework";
import { LocatedOwnWindowGateway } from "../own-window/located.gateway.js";
import type { OwnWindowGateway } from "../own-window/own-window.gateway.js";

export type GroupsParts = {
	readonly ownWindow: OwnWindowGateway;
};

export function groupsPartsOn({ platform, scope }: ConfigFacts<object>): GroupsParts {
	const label = platform === "tauri" ? studioWindowOf(location.search).label : MAIN_STUDIO_WINDOW;
	return {
		ownWindow: new LocatedOwnWindowGateway(label, scope.workspaceId),
	};
}
