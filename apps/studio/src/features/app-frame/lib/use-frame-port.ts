import { createContext, useContext, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { PORT_WANTED, handPort, messagePortListener } from "@widgetarium/core/requests";
import type { Answer, ServingServer } from "@widgetarium/core/requests";
import { APP_CALLER_HEADER } from "./app-caller.js";

const NO_RELAY = "An installed app is drawn inside AppFramesProvider, which relays its frames' calls to the core";

export const FrameRelayContext = createContext<ServingServer | null>(null);

export function useFramePort(
	frame: RefObject<HTMLIFrameElement | null>,
	app: string,
	onAnswered: (answer: Answer<unknown>) => void,
): void {
	const relay = useContext(FrameRelayContext);
	const latest = useRef(onAnswered);

	useEffect(() => {
		latest.current = onAnswered;
	});

	useEffect(() => {
		if (relay === null) {
			throw new Error(NO_RELAY);
		}

		return servePortHandovers(
			() => frame.current?.contentWindow ?? null,
			app,
			relay,
			(answer) => latest.current(answer),
		);
	}, [frame, app, relay]);
}

export function servePortHandovers(
	frameWindowOf: () => Window | null,
	app: string,
	relay: ServingServer,
	onAnswered: (answer: Answer<unknown>) => void,
): () => void {
	const served = {
		stop: (): void => undefined,
	};
	const wanted = ({ source, data }: MessageEvent): void => {
		const frameWindow = frameWindowOf();

		if (frameWindow === null || source !== frameWindow || data !== PORT_WANTED) {
			return;
		}

		served.stop();
		served.stop = handFreshPort(frameWindow, app, relay, onAnswered);
	};
	window.addEventListener("message", wanted);
	return () => {
		window.removeEventListener("message", wanted);
		served.stop();
	};
}

function handFreshPort(
	frameWindow: Window,
	app: string,
	relay: ServingServer,
	onAnswered: (answer: Answer<unknown>) => void,
): () => void {
	const channel = new MessageChannel();
	const headers = {
		[APP_CALLER_HEADER]: app,
	};
	const stop = messagePortListener(channel.port1, { headers, onAnswered }).serve(relay);
	handPort(frameWindow, channel.port2);
	console.info(`[widgetarium] app ${app}: no port → port handed`);
	return stop;
}
