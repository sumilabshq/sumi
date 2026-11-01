import { AuthenticatedGuard, Server, module, oneOf } from "@widgetarium/core/requests";
import { webPagePartsOn } from "./gateways/web-page-parts/web-page-parts.gateway.js";
import { AppTabsHost } from "./shared/host/app-tabs.host.js";
import { NativeWebPagesHost } from "./shared/host/native-web-pages.host.js";
import {
	CloseWebPageCommand,
	GoBackCommand,
	GoForwardCommand,
	OpenWebPageCommand,
	PlaceWebPageCommand,
	ReloadWebPageCommand,
	RereadWebPageSubscriber,
	WebPageCallLoggerMiddleware,
	WebPageQuery,
} from "./features/pages/requests.js";

export { AppTabsHost } from "./shared/host/app-tabs.host.js";
export { NativeWebPagesHost } from "./shared/host/native-web-pages.host.js";

export const WebPageModule = module("web-page")
	.on(Server)
	.needs(
		oneOf({
			web: {
				webAppTabs: AppTabsHost,
			},
			tauri: {
				tauriAppTabs: AppTabsHost,
				nativePages: NativeWebPagesHost,
			},
		}),
	)
	.subscribers(RereadWebPageSubscriber)
	.public(
		WebPageQuery,
		OpenWebPageCommand,
		PlaceWebPageCommand,
		GoBackCommand,
		GoForwardCommand,
		ReloadWebPageCommand,
		CloseWebPageCommand,
	)
	.guard(AuthenticatedGuard)
	.use(WebPageCallLoggerMiddleware)
	.provide((facts) => webPagePartsOn(facts));
