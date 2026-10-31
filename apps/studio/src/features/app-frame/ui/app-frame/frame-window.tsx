import { createElement as h, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import type { AppEvent, WelcomeBody, Workspace } from "@sumi/contract";
import type { FrameLink } from "../../lib/frame-link.js";
import { APP_FRAME_SANDBOX } from "../../lib/frame-sandbox.js";
import type { FrameAsk } from "../../lib/frame-services.js";
import { themeNow } from "../../lib/theme-now.js";
import { useHostEvents } from "../../lib/use-host-events.js";
import { useServedFrame } from "../../lib/use-served-frame.js";

export type FrameWorkspace = Workspace;

export interface ReportedPage {
	readonly address?: string;
	readonly title?: string;
	readonly favicon?: string;
}

export interface FrameWindowProps {
	readonly app: string;
	readonly url: string;
	readonly address: string;
	readonly workspace: FrameWorkspace;
	readonly isShown: boolean;
	readonly onPage: (page: ReportedPage) => void;
	readonly onReady: () => void;
	readonly onBusy: (isBusy: boolean) => void;
	readonly onFailed: (reason: string) => void;
	readonly onLink: (link: FrameLink) => void;
	readonly onAsk: FrameAsk;
}

type HeardEvents = Pick<FrameWindowProps, "app" | "onReady" | "onBusy" | "onFailed" | "onLink">;

export function FrameWindow(props: FrameWindowProps): ReactElement {
	const { app, url } = props;
	const frame = useRef<HTMLIFrameElement | null>(null);
	useFrameConversation(frame, props);

	return (
		<iframe
			ref={frame}
			className="wg-app-frame"
			title={app}
			src={url}
			sandbox={APP_FRAME_SANDBOX}
			data-app-frame={app}
			data-app-frame-src={url}
		/>
	);
}

function useFrameConversation(frame: RefObject<HTMLIFrameElement | null>, props: FrameWindowProps): void {
	const served = useServedFrame(frame, props.app, {
		welcomeOf: () => welcomeOf(props),
		onEvent: (event) => answerEvent(event, props, reported),
		onAsk: props.onAsk,
	});
	const reported = useHostEvents(served, {
		address: props.address,
		isShown: props.isShown,
	});
}

function welcomeOf({ address, workspace }: FrameWindowProps): WelcomeBody {
	return {
		address,
		theme: themeNow(),
		workspace,
	};
}

function answerEvent(event: AppEvent, props: FrameWindowProps, reported: RefObject<string>): void {
	const page = pageOf(event);

	if (page === null) {
		heard(event, props);
		return;
	}

	if (page.address !== undefined) {
		reported.current = page.address;
	}

	props.onPage(page);
}

function pageOf(event: AppEvent): ReportedPage | null {
	switch (event.type) {
		case "navigated":
			return {
				address: event.address,
			};
		case "title":
			return {
				title: event.text,
			};
		case "favicon":
			return {
				favicon: event.url,
			};
		default:
			return null;
	}
}

function heard(event: AppEvent, { app, onReady, onBusy, onFailed, onLink }: HeardEvents): void {
	switch (event.type) {
		case "ready":
			onReady();
			return;
		case "busy":
			onBusy(event.isBusy);
			return;
		case "error":
			console.error(`[widgetarium] app ${app} failed: ${event.message}`, event.stack ?? "");
			onFailed(event.message);
			return;
		case "open-link":
			onLink(event);
			return;
		default:
			// TODO: mark and notify reach Places and the person once those services exist
			console.info(`[widgetarium] app ${app} said ${event.type}; the shell does not act on it yet`);
	}
}
