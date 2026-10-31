import { orpcTransport } from "@widgetarium/core/requests";
import { createFrameRelay } from "../apps/studio/src/features/app-frame/lib/frame-relay.ts";
import { APP_FRAME_SANDBOX } from "../apps/studio/src/features/app-frame/lib/frame-sandbox.ts";
import { servePortHandovers } from "../apps/studio/src/features/app-frame/lib/use-frame-port.ts";

declare global {
	interface Window {
		relayAnswers: number;
	}
}

const FRAME_APP = "notes";

window.relayAnswers = 0;
const frame = document.createElement("iframe");
frame.setAttribute("sandbox", APP_FRAME_SANDBOX);
frame.src = "/app.html#sumi-tab=t1";
servePortHandovers(
	() => frame.contentWindow,
	FRAME_APP,
	createFrameRelay(orpcTransport(location.origin)),
	() => {
		window.relayAnswers += 1;
	},
);
document.body.append(frame);
