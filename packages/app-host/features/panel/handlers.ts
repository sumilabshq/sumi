import { handler } from "@widgetarium/core/requests";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { ClosePanelCommand } from "./contract.js";
import { AppHostClientModule } from "../../module.js";

export const ClosePanelCommandHandler = handler(ClosePanelCommand, AppHostClientModule)
	.inject({ appTabsGateway: AppTabsGateway })
	.handle((_input, { appTabsGateway }) => {
		appTabsGateway.closePanel();
	});
