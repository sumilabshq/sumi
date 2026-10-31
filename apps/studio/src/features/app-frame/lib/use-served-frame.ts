import { serveFrame } from "@sumi/contract";
import type { AnswerResult, AppEvent, AppHandlers, FramePair, ServedApp, WelcomeBody } from "@sumi/contract";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { reportFrameProblem } from "./frame-problem.js";

export interface FrameHandlers {
	readonly welcomeOf: () => WelcomeBody;
	readonly onEvent: (event: AppEvent) => void;
}

interface FrameServing {
	readonly frame: RefObject<HTMLIFrameElement | null>;
	readonly app: string;
	readonly latest: RefObject<FrameHandlers>;
	readonly served: RefObject<ServedApp | null>;
}

const UNKNOWN_SERVICE = 'Sumi has no service "{service}" yet';

export function useServedFrame(
	frame: RefObject<HTMLIFrameElement | null>,
	app: string,
	handlers: FrameHandlers,
): RefObject<ServedApp | null> {
	const served = useRef<ServedApp | null>(null);
	const latest = useRef(handlers);

	useEffect(() => {
		latest.current = handlers;
	});

	useEffect(() => startServing({ frame, app, latest, served }), [frame, app]);

	return served;
}

function startServing({ frame, app, latest, served }: FrameServing): (() => void) | undefined {
	const frameWindow = frame.current?.contentWindow ?? null;

	if (frameWindow === null) {
		return undefined;
	}

	const serving = serveFrame(framePairOf(frameWindow, app), latestHandlersOf(app, latest));
	served.current = serving;
	return () => {
		serving.close();
		served.current = null;
	};
}

function latestHandlersOf(app: string, latest: RefObject<FrameHandlers>): AppHandlers {
	return {
		welcomeOf: () => latest.current.welcomeOf(),
		onEvent: (event) => latest.current.onEvent(event),
		onAsk: (service) => Promise.resolve(unknownService(service)),
		onProblem: (reason) => reportFrameProblem(app, reason),
	};
}

function unknownService(service: string): AnswerResult {
	return {
		ok: false,
		reason: UNKNOWN_SERVICE.replace("{service}", service),
	};
}

function framePairOf(frame: Window, app: string): FramePair {
	return {
		shell: window,
		frame,
		app,
	};
}
