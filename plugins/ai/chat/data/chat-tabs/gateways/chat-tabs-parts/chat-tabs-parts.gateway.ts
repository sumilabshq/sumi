import { placesWindowHere } from "@widgetarium/behaviors";
import type { ConfigFacts } from "@widgetarium/data-framework";
import { FixedOwnWindowGateway } from "../own-window/fixed.gateway.js";
import type { OwnWindowGateway } from "../own-window/own-window.gateway.js";

export type ChatTabsParts = {
	readonly ownWindow: OwnWindowGateway;
};

export function chatTabsPartsOn({ platform, scope }: ConfigFacts<object>): ChatTabsParts {
	return {
		ownWindow: new FixedOwnWindowGateway(placesWindowHere(platform === "tauri" ? location.search : null, scope.workspaceId)),
	};
}
