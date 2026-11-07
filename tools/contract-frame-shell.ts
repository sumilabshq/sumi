import { app, orpcTransport } from "@widgetarium/data-framework";
import { PlacesModule } from "../packages/shared/contract/index.ts";
import { APP_FRAME_SANDBOX } from "../apps/studio/src/features/app-frame/lib/frame-sandbox.ts";
import { servePortHandovers } from "../apps/studio/src/features/app-frame/lib/use-frame-port.ts";
import type { FrameOpened } from "../apps/studio/src/features/app-frame/lib/frame-relay.ts";
import { frameRoutesOf } from "../apps/studio/src/tabs/frame-routes.ts";
import { webPageServingOf } from "../plugins/browser-page/src/features/web-page/lib/web-page-serving.ts";
import { WebPageModule } from "../plugins/browser-page/data/web-page/index.ts";
import { startStudioAppearance } from "../apps/studio/src/tabs/studio-appearance.ts";

declare global {
	interface Window {
		relayAnswers: number;
	}
}

const FRAMES: readonly (FrameOpened & { readonly page: string })[] = [
	{
		app: "notes",
		tabId: "t1",
		page: "/app.html",
	},
	{
		app: "chat",
		tabId: "c1",
		page: "/chat.html",
	},
];

window.relayAnswers = 0;
const core = orpcTransport(location.origin);
const routesFor = frameRoutesOf({
	workspaceId: "contract-frame",
	core,
	appearance: startStudioAppearance(window).transport,
	frameModules: [
		{
			contract: WebPageModule,
			serving: webPageServingOf({
				platform: "browser",
				windowApp: app().imports(PlacesModule({ over: core })).start(),
			}),
		},
	],
});

for (const { app: frameApp, tabId, page } of FRAMES) {
	const frame = document.createElement("iframe");
	frame.setAttribute("sandbox", APP_FRAME_SANDBOX);
	frame.src = `${page}#sumi-tab=${tabId}`;
	servePortHandovers(() => frame.contentWindow, {
		opened: {
			app: frameApp,
			tabId,
		},
		routesFor,
		onAnswered: () => {
			window.relayAnswers += 1;
		},
	});
	document.body.append(frame);
}
