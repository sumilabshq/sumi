import { useEffect, useState } from "react";
import { runtime } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import type { DrawnTabPage, TabModules } from "@sumi/sumi-host-plugin";
import type { FrameOpened, FrameRoutes } from "./frame-relay.js";
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

const TAB_PAGE_PLATFORM = "browser";

const STARTED = "[widgetarium] app {app} tab {tab}: no view → view started over its routes and its page's modules";
const START_FAILED =
	"[widgetarium] app {app} tab {tab}: no view → no view, its routes or page modules failed ({reason})";
const STOPPED_FIRST =
	"[widgetarium] app {app} tab {tab}: no view → no view, the tab unmounted while its routes were built";

export function useTabPageApp(page: DrawnTabPage, opened: FrameOpened): Runtime | null {
	const routesFor = useFrameRoutesFor();
	const offers = useWindowOffers();
	const [started, setStarted] = useState<Runtime | null>(null);
	const { app: appId, tabId } = opened;
	useEffect(() => {
		const held: HeldTabApp = {
			routes: null,
			app: null,
			isStopped: false,
		};
		const said = (template: string): string => template.replace("{app}", appId).replace("{tab}", tabId);
		const routes = routesFor({ app: appId, tabId });
		Promise.all([routes, page.modulesOf({ app: appId, tabId }, offers)])
			.then(([builtRoutes, own]) => {
				if (held.isStopped) {
					builtRoutes.release();
					console.info(said(STOPPED_FIRST));
					return;
				}

				held.app = appOver({ routes: builtRoutes, own }, { appId, workspaceId: offers.workspaceId });
				held.routes = builtRoutes;
				setStarted(held.app);
				console.info(said(STARTED));
			})
			.catch((failure: unknown) => {
				void routes.then(
					(built) => built.release(),
					() => undefined,
				);
				console.error(said(START_FAILED).replace("{reason}", String(failure)));
			});
		return () => {
			held.isStopped = true;
			held.app?.stop();
			held.routes?.release();
			setStarted(null);
		};
	}, [routesFor, offers, page, appId, tabId]);
	return started;
}

function appOver({ routes, own }: TabAppParts, { appId, workspaceId }: TabAppScope): Runtime {
	const transport = relayTransportOf(routes.routes, appId);
	const ownImported = new Set(own.imports.map(({ name }) => name));
	const routed = routes.routes
		.map(({ module }) => module({ over: transport }))
		.filter(({ name }) => !ownImported.has(name));
	return runtime()
		.modules(...own.modules)
		.imports(...routed, ...own.imports)
		.start({
			platform: TAB_PAGE_PLATFORM,
			scope: {
				workspaceId,
			},
		});
}
