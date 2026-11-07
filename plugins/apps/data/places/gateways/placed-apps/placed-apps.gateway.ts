import type { PlacedApps } from "../../shared/lib/tabs/app-abilities.js";

export abstract class PlacedAppsGateway {
	abstract placedApps(): PlacedApps;
}
