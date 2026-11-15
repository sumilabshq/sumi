import type { PlacedApp } from "../../shared/host/places.host.js";
import { placedAppsOf } from "../../shared/lib/tabs/app-abilities.js";
import type { PlacedApps } from "../../shared/lib/tabs/app-abilities.js";
import { PlacedAppsGateway } from "./placed-apps.gateway.js";

export class ListedPlacedAppsGateway extends PlacedAppsGateway {
	private readonly listed: PlacedApps;

	constructor(apps: readonly PlacedApp[]) {
		super();
		this.listed = placedAppsOf(apps);
	}

	override placedApps(): PlacedApps {
		return this.listed;
	}
}
