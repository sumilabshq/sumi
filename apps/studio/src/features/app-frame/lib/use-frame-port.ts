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
const HANDED = "[widgetarium] app {app} tab {tab}: no port → port handed";
const ROUTES_FAILED = "[widgetarium] app {app} tab {tab}: no port → no port, its routes failed ({reason})";
const STOPPED_FIRST =
	"[widgetarium] app {app} tab {tab}: no port → no port, the frame unmounted while its routes were built";

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
	const routesFor = useFrameRoutesFor();
	const latest = useLatestAnswered(onAnswered);
	useEffect(
		() =>
			servePortHandovers(() => frame.current?.contentWindow ?? null, {
				opened: { app, tabId },
				routesFor,
				onAnswered: (answer) => latest.current(answer),
			}),
		[frame, app, tabId, routesFor, latest],
	);
}

export function servePortHandovers(frameWindowOf: () => Window | null, handovers: PortHandovers): () => void {
	const handover = new FramePortHandover(handovers);
	const onPortWanted = ({ source, data }: MessageEvent): void => {
		const frameWindow = frameWindowOf();

		if (frameWindow === null || source !== frameWindow || data !== PORT_WANTED) {
			return;
		}

		handover.hand(frameWindow);
	};
	window.addEventListener("message", onPortWanted);
	return () => {
		window.removeEventListener("message", onPortWanted);
		handover.stop();
	};
}

function useFrameRoutesFor(): FrameRoutesFor {
	const routesFor = useContext(FrameRoutesContext);

	if (routesFor === null) {
		throw new Error(NO_ROUTES);
	}

	return routesFor;
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
		this.handovers.routesFor(this.handovers.opened).then(
			(routes) => this.handFreshPort(frameWindow, routes),
			(failure: unknown) => {
				this.isHanded = false;
				console.error(this.said(ROUTES_FAILED).replace("{reason}", String(failure)));
			},
		);
	}

	stop(): void {
		this.isStopped = true;
		this.stopServing();
	}

	private handFreshPort(frameWindow: Window, routes: FrameRoutes): void {
		if (this.isStopped) {
			routes.release();
			console.info(this.said(STOPPED_FIRST));
			return;
		}

		const channel = new MessageChannel();
		const stopRelay = servedRelay(channel.port1, this.handovers, routes);
		handPort(frameWindow, channel.port2);
		console.info(this.said(HANDED));
		this.stopServing = () => {
			stopRelay();
			routes.release();
		};
	}

	private said(template: string): string {
		return template.replace("{app}", this.handovers.opened.app).replace("{tab}", this.handovers.opened.tabId);
	}
}

function servedRelay(port: MessagePort, { opened, onAnswered }: PortHandovers, routes: FrameRoutes): () => void {
	const headers = {
		[APP_CALLER_HEADER]: opened.app,
	};
	return messagePortListener(port, { headers, onAnswered }).serve(createFrameRelay(routes.routes));
}
