import { createContext, useContext, useEffect } from "react";
import type { RefObject } from "react";
import { PORT_WANTED, handPort, messagePortListener } from "@widgetarium/core/requests";
import { APP_CALLER_HEADER } from "./app-caller.js";
import { createFrameRelay } from "./frame-relay.js";
import type { FrameOpened, FrameRoutes, FrameRoutesFor } from "./frame-relay.js";
import { useLatestAnswered } from "./use-latest-answered.js";
import type { OnAnswered } from "./use-latest-answered.js";

const SECOND_DOCUMENT =
	"[widgetarium] app {app}: a second document in its frame wanted a port → refused; a frame gets one port per mount";
const NO_ROUTES = "An installed app is drawn inside AppFramesProvider, which routes its frames' calls";

export const FrameRoutesContext = createContext<FrameRoutesFor | null>(null);

export interface PortHandovers {
	readonly opened: FrameOpened;
	readonly routesFor: FrameRoutesFor;
	readonly onAnswered: OnAnswered;
}

export function useFramePort(
	frame: RefObject<HTMLIFrameElement | null>,
	{ app, tabId }: FrameOpened,
	onAnswered: OnAnswered,
): void {
	const routesFor = useContext(FrameRoutesContext);
	const latest = useLatestAnswered(onAnswered);
	useEffect(() => {
		if (routesFor === null) {
			throw new Error(NO_ROUTES);
		}

		return servePortHandovers(() => frame.current?.contentWindow ?? null, {
			opened: { app, tabId },
			routesFor,
			onAnswered: (answer) => latest.current(answer),
		});
	}, [frame, app, tabId, routesFor, latest]);
}

export function servePortHandovers(frameWindowOf: () => Window | null, handovers: PortHandovers): () => void {
	const handover = new FramePortHandover(handovers);
	const onPortWanted = ({ source, data }: MessageEvent): void => {
		const frameWindow = frameWindowOf();

		if (frameWindow !== null && source === frameWindow && data === PORT_WANTED) {
			handover.hand(frameWindow);
		}
	};
	window.addEventListener("message", onPortWanted);
	return () => {
		window.removeEventListener("message", onPortWanted);
		handover.stop();
	};
}

class FramePortHandover {
	private isHanded = false;
	private isStopped = false;
	private stopServing = (): void => undefined;

	constructor(private readonly handovers: PortHandovers) {}

	hand(frameWindow: Window): void {
		if (this.isHanded) {
			console.warn(SECOND_DOCUMENT.replace("{app}", this.handovers.opened.app));
			return;
		}

		this.isHanded = true;
		void handFreshPort(frameWindow, this.handovers).then((stop) => this.served(stop));
	}

	stop(): void {
		this.isStopped = true;
		this.stopServing();
	}

	private served(stop: () => void): void {
		if (this.isStopped) {
			stop();
			return;
		}

		this.stopServing = stop;
	}
}

async function handFreshPort(frameWindow: Window, handovers: PortHandovers): Promise<() => void> {
	const { opened, routesFor } = handovers;
	const routes = await routesFor(opened);
	const channel = new MessageChannel();
	const stopServing = servedRelay(channel.port1, handovers, routes);
	handPort(frameWindow, channel.port2);
	console.info(`[widgetarium] app ${opened.app} tab ${opened.tabId}: no port → port handed`);
	return () => {
		stopServing();
		routes.release();
	};
}

function servedRelay(port: MessagePort, { opened, onAnswered }: PortHandovers, routes: FrameRoutes): () => void {
	const headers = {
		[APP_CALLER_HEADER]: opened.app,
	};
	return messagePortListener(port, { headers, onAnswered }).serve(createFrameRelay(routes.routes));
}
