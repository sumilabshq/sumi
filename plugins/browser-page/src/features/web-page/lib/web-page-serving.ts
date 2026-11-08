import { places } from "@sumi/contract";
import type { FrameServing, WindowOffers } from "@sumi/sumi-host-plugin";
import type { Runtime } from "@widgetarium/data-framework";
import { webPage } from "@widgetarium/web-page/implementation";
import type { AppTabs, NativeWebPages, WebPageConfig } from "@widgetarium/web-page/implementation";
import { nativeWebPagesOver } from "./native-web-pages.js";

type ServingOffers = Pick<WindowOffers, "platform" | "windowApp">;

const NOT_CLOSED = "[browser-page] tab {tab}: its web page was left open on frame close ({reason})";

export function webPageServingOf({ platform, windowApp }: ServingOffers): FrameServing {
	const nativePages = platform === "tauri" ? nativeWebPagesOver(windowApp) : null;
	return {
		module: webPage(webPageConfigOf(appTabsOver(windowApp), nativePages)),
		frameClosed: (tabId) => closeLeftPage(nativePages, tabId),
	};
}

function webPageConfigOf(appTabs: AppTabs, nativePages: NativeWebPages | null): WebPageConfig {
	if (nativePages === null) {
		return {
			kind: "web",
			webAppTabs: appTabs,
		};
	}

	return {
		kind: "tauri",
		tauriAppTabs: appTabs,
		nativePages,
	};
}

function appTabsOver(windowApp: Runtime): AppTabs {
	return {
		appOfTab: async (tab) => {
			const answer = await windowApp.send(places.tabFacts.appTab, { id: tab });
			return answer.ok ? answer.output.app : null;
		},
	};
}

function closeLeftPage(nativePages: NativeWebPages | null, tabId: string): void {
	if (nativePages === null) {
		return;
	}

	nativePages.closePage(tabId).catch((failure: unknown) => {
		console.warn(NOT_CLOSED.replace("{tab}", tabId).replace("{reason}", String(failure)));
	});
}
