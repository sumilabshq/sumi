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

export function webPagePartsOn({ host }: { readonly host: WebHosts | TauriHosts }): WebPageParts {
	if (host.kind === "tauri") {
		return {
			webPages: new NativeWebPagesGateway(host.nativePages),
			appTabs: new PlacesAppTabsGateway(host.tauriAppTabs),
		};
	}

	return {
		webPages: new MemoryWebPagesGateway(),
		appTabs: new PlacesAppTabsGateway(host.webAppTabs),
	};
}
