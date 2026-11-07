import { AuthenticatedGuard, Server, module } from "@widgetarium/data-framework";
import { webPagePartsOn } from "./gateways/web-page-parts/web-page-parts.gateway.js";
import type { WebPageConfig } from "./gateways/web-page-parts/web-page-parts.gateway.js";
import { WebPageCallLoggerMiddleware } from "./features/pages/requests.js";
import { handled } from "./generated/handled.js";

export type { AppTabs } from "./shared/host/app-tabs.host.js";
export type { NativeWebPages } from "./shared/host/native-web-pages.host.js";
export type { WebPageConfig } from "./gateways/web-page-parts/web-page-parts.gateway.js";

export const WebPageModule = module("web-page")
	.on(Server)
	.config<WebPageConfig>()
	.guard(AuthenticatedGuard)
	.use(WebPageCallLoggerMiddleware)
	.provide((facts) => webPagePartsOn(facts))
	.handles(...handled);
