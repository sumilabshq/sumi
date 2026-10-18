import { handler } from "@widgetarium/core/requests";
import { HostAppsGateway } from "../../gateways/host-apps/host-apps.gateway.js";
import { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import { AppHostClientModule } from "../../module.js";
import { AppPickerQuery } from "./contract.js";
import { appPickerOf } from "./lib/picker-apps.js";

export const AppPickerQueryHandler = handler(AppPickerQuery, AppHostClientModule)
	.inject({
		hostTabs: HostTabs,
		hostAppsGateway: HostAppsGateway,
	})
	.watch((_input, { hostTabs, hostAppsGateway }, changed) => {
		const stops = [hostTabs.watch(changed), hostAppsGateway.watch(changed)];
		return () => stops.forEach((stop) => stop());
	})
	.handle(({ search }, { hostTabs, hostAppsGateway }) =>
		appPickerOf({
			tabs: hostTabs.now().tabs,
			hostApps: hostAppsGateway.apps(),
			search,
		}),
	);
