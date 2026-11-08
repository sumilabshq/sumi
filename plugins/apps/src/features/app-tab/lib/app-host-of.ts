import { appHost } from "@widgetarium/app-host/implementation";
import type { WindowModuleOffers } from "@sumi/sumi-host-plugin";
import type { DeviceModule } from "@widgetarium/data-framework";

export function appHostOf({ tauri }: WindowModuleOffers): DeviceModule {
	return tauri === undefined ? appHost : appHost({ tauri });
}
