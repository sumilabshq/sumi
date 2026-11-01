import { app, orpcTransport } from "@widgetarium/core/requests";
import { PlacesModule } from "../packages/shared/contract/index.ts";
import { APP_FRAME_SANDBOX } from "../apps/studio/src/features/app-frame/lib/frame-sandbox.ts";
import { servePortHandovers } from "../apps/studio/src/features/app-frame/lib/use-frame-port.ts";
import { frameRoutesOf } from "../apps/studio/src/tabs/frame-routes.ts";
import { echoAssistantPort } from "./echo-assistant-port.ts";

declare global {
	interface Window {
		relayAnswers: number;
	}
}

const FRAME_APP = "notes";
const FRAME_TAB = "t1";

window.relayAnswers = 0;
const core = orpcTransport(location.origin);
const frame = document.createElement("iframe");
frame.setAttribute("sandbox", APP_FRAME_SANDBOX);
frame.src = `/app.html#sumi-tab=${FRAME_TAB}`;
servePortHandovers(() => frame.contentWindow, {
	opened: {
		app: FRAME_APP,
		tabId: FRAME_TAB,
	},
	routesFor: frameRoutesOf({
		workspaceId: "contract-frame",
		core,
		studioApp: app().imports(PlacesModule.over(core)).start(),
		assistantHost: {
			webAssistant: echoAssistantPort(),
		},
		nativeWebPages: null,
	}),
	onAnswered: () => {
		window.relayAnswers += 1;
	},
});
document.body.append(frame);
