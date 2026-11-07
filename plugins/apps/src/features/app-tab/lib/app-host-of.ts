import { AppHostModule } from "@widgetarium/app-host/module";
import type { WindowModuleOffers } from "@sumi/sumi-host-plugin";
import type { DeviceModule } from "@widgetarium/data-framework";

export function appHostOf({ tauri }: WindowModuleOffers): DeviceModule {
	return tauri === undefined ? AppHostModule : AppHostModule({ tauri });
}
