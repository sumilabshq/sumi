import { AuthenticatedGuard, Server, module, oneOf } from "@widgetarium/framework";
import { webPagePartsOn } from "./gateways/web-page-parts/web-page-parts.gateway.js";
import { AppTabsHost } from "./shared/host/app-tabs.host.js";
import { NativeWebPagesHost } from "./shared/host/native-web-pages.host.js";
import {
	CloseWebPageCommand,
	GoBackWebPageCommand,
	GoForwardWebPageCommand,
	OpenWebPageCommand,
	PlaceWebPageCommand,
	ReloadWebPageCommand,
	RereadWebPageSubscriber,
	WebPageCallLoggerMiddleware,
	WebPageQuery,
} from "./features/pages/requests.js";

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
		GoBackWebPageCommand,
		GoForwardWebPageCommand,
		ReloadWebPageCommand,
		CloseWebPageCommand,
	)
	.guard(AuthenticatedGuard)
	.use(WebPageCallLoggerMiddleware)
	.provide((facts) => webPagePartsOn(facts));
