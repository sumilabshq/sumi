import { useEffect, useMemo, useState } from "react";
import { runtime } from "@widgetarium/data-framework";
import type { RemoteModule, Runtime } from "@widgetarium/data-framework";
import type { DrawnTabPage, TabModules, WindowOffers } from "@sumi/sumi-host-plugin";
import type { FrameOpened, FrameRoutes, FrameRoutesFor } from "./frame-relay.js";
import { relayTransportOf } from "./relay-transport.js";
import { useFrameRoutesFor } from "./use-frame-port.js";
import { useWindowOffers } from "./window-offers-context.js";

interface HeldTabApp {
	routes: FrameRoutes | null;
	app: Runtime | null;
	isStopped: boolean;
}

interface TabAppParts {
	readonly routes: FrameRoutes;
	readonly own: TabModules;
}

interface TabAppScope {
	readonly appId: string;
	readonly workspaceId: string;
}

interface TabAppStart {
	readonly routesFor: FrameRoutesFor;
	readonly offers: WindowOffers;
	readonly page: DrawnTabPage;
	readonly opened: FrameOpened;
	readonly onStarted: (app: Runtime | null) => void;
}

const TAB_PAGE_PLATFORM = "browser";

const STARTED = "[widgetarium] app {app} tab {tab}: no view → view started over its routes and its page's modules";
const START_FAILED =
	"[widgetarium] app {app} tab {tab}: no view → no view, its routes or page modules failed ({reason})";
const STOPPED_FIRST =
	"[widgetarium] app {app} tab {tab}: no view → no view, the tab unmounted while its routes were built";

export function useTabPageApp(page: DrawnTabPage, asked: FrameOpened): Runtime | null {
	const [started, setStarted] = useState<Runtime | null>(null);
	useStartsTabApp(page, asked, setStarted);
	return started;
}

function useStartsTabApp(page: DrawnTabPage, asked: FrameOpened, onStarted: (app: Runtime | null) => void): void {
	const routesFor = useFrameRoutesFor();
	const offers = useWindowOffers();
	const opened = useSameFrame(asked);
	useEffect(() => {
		return startTabApp({
			routesFor,
			offers,
			page,
			opened,
			onStarted,
		});
	}, [routesFor, offers, page, opened, onStarted]);
}

function useSameFrame({ app, tabId }: FrameOpened): FrameOpened {
	return useMemo(
		() => ({
			app,
			tabId,
		}),
		[app, tabId],
	);
}

function startTabApp(start: TabAppStart): () => void {
	const held: HeldTabApp = {
		routes: null,
		app: null,
		isStopped: false,
	};
	const routes = start.routesFor(start.opened);
	Promise.all([routes, start.page.modulesOf(start.opened, start.offers)])
		.then(([built, own]) => holdStarted(held, start, { routes: built, own }))
		.catch((failure: unknown) => reportStartFailed(routes, start.opened, failure));
	return () => stopTabApp(held, start.onStarted);
}

function stopTabApp(held: HeldTabApp, onStarted: (app: Runtime | null) => void): void {
	held.isStopped = true;
	held.app?.stop();
	held.routes?.release();
	onStarted(null);
}

function reportStartFailed(routes: Promise<FrameRoutes>, opened: FrameOpened, failure: unknown): void {
	void routes.then(
		(built) => built.release(),
		() => undefined,
	);
	console.error(saidOf(opened, START_FAILED).replace("{reason}", String(failure)));
}

function holdStarted(held: HeldTabApp, start: TabAppStart, parts: TabAppParts): void {
	if (held.isStopped) {
		parts.routes.release();
		console.info(saidOf(start.opened, STOPPED_FIRST));
		return;
	}

	held.app = appOver(parts, { appId: start.opened.app, workspaceId: start.offers.workspaceId });
	held.routes = parts.routes;
	start.onStarted(held.app);
	console.info(saidOf(start.opened, STARTED));
}

function saidOf({ app, tabId }: FrameOpened, template: string): string {
	return template.replace("{app}", app).replace("{tab}", tabId);
}

function appOver(parts: TabAppParts, { appId, workspaceId }: TabAppScope): Runtime {
	return runtime()
		.modules(...parts.own.modules)
		.imports(...routedImportsOf(parts, appId), ...parts.own.imports)
		.start({
			platform: TAB_PAGE_PLATFORM,
			scope: {
				workspaceId,
			},
		});
}

function routedImportsOf({ routes, own }: TabAppParts, appId: string): readonly RemoteModule[] {
	const transport = relayTransportOf(routes.routes, appId);
	const ownImported = new Set(own.imports.map(({ name }) => name));
	return routes.routes.map(({ module }) => module({ over: transport })).filter(({ name }) => !ownImported.has(name));
}
