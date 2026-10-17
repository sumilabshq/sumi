import { handler, refuse } from "@widgetarium/core/requests";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { AppTabsQuery, ShowAppCommand } from "./contract.js";
import { AppHostClientModule } from "../../module.js";

const NOT_HELD = 'the host holds no app "{id}"';

export const AppTabsQueryHandler = handler(AppTabsQuery, AppHostClientModule)
	.inject({ appTabsGateway: AppTabsGateway })
	.watch((_input, { appTabsGateway }, changed) => appTabsGateway.watch(changed))
	.handle((_input, { appTabsGateway }) => {
		const shownId = appTabsGateway.shownId();
		return {
			tabs: appTabsGateway.tabs().map((tab) => ({ ...tab, isShown: tab.id === shownId })),
			// TODO: the chat opens a preview here; nothing does yet
			preview: null,
		};
	});

export const ShowAppCommandHandler = handler(ShowAppCommand, AppHostClientModule)
	.inject({ appTabsGateway: AppTabsGateway })
	.handle(({ id }, { appTabsGateway }) => {
		if (!appTabsGateway.tabs().some((tab) => tab.id === id)) {
			return refuse(NOT_HELD.replace("{id}", id));
		}

		appTabsGateway.show(id);
	});
