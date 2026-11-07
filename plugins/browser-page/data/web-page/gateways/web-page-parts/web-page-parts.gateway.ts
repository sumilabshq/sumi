import type { AppTabs } from "../../shared/host/app-tabs.host.js";
import type { NativeWebPages } from "../../shared/host/native-web-pages.host.js";
import type { AppTabsGateway } from "../app-tabs/app-tabs.gateway.js";
import { PlacesAppTabsGateway } from "../app-tabs/places.gateway.js";
import { MemoryWebPagesGateway } from "../web-pages/memory.gateway.js";
import { NativeWebPagesGateway } from "../web-pages/native.gateway.js";
import type { WebPagesGateway } from "../web-pages/web-pages.gateway.js";

export type WebPageParts = {
	readonly webPages: WebPagesGateway;
	readonly appTabs: AppTabsGateway;
};

export interface WebHosts {
	readonly kind: "web";
	readonly webAppTabs: AppTabs;
}

export interface TauriHosts {
	readonly kind: "tauri";
	readonly tauriAppTabs: AppTabs;
	readonly nativePages: NativeWebPages;
}

export type WebPageConfig = WebHosts | TauriHosts;

export function webPagePartsOn({ config }: { readonly config: WebPageConfig }): WebPageParts {
	if (config.kind === "tauri") {
		return {
			webPages: new NativeWebPagesGateway(config.nativePages),
			appTabs: new PlacesAppTabsGateway(config.tauriAppTabs),
		};
	}

	return {
		webPages: new MemoryWebPagesGateway(),
		appTabs: new PlacesAppTabsGateway(config.webAppTabs),
	};
}
