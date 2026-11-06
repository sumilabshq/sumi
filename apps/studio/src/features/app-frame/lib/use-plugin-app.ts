import { useEffect, useState } from "react";
import { app } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import type { FrameOpened, FrameRoutes } from "./frame-relay.js";
import { relayTransportOf } from "./relay-transport.js";
import { useFrameRoutesFor } from "./use-frame-port.js";

const STARTED = "[widgetarium] app {app} tab {tab}: no view → view started over its routes";
const ROUTES_FAILED = "[widgetarium] app {app} tab {tab}: no view → no view, its routes failed ({reason})";
const STOPPED_FIRST =
	"[widgetarium] app {app} tab {tab}: no view → no view, the tab unmounted while its routes were built";

export function usePluginApp(opened: FrameOpened): StartedApp | null {
	const routesFor = useFrameRoutesFor();
	const [started, setStarted] = useState<StartedApp | null>(null);
	const { app: appId, tabId } = opened;
	useEffect(() => {
		const held: { routes: FrameRoutes | null; app: StartedApp | null; isStopped: boolean } = {
			routes: null,
			app: null,
			isStopped: false,
		};
		const said = (template: string): string => template.replace("{app}", appId).replace("{tab}", tabId);
		routesFor({ app: appId, tabId }).then(
			(routes) => {
				if (held.isStopped) {
					routes.release();
					console.info(said(STOPPED_FIRST));
					return;
				}

				held.routes = routes;
				held.app = appOver(routes, appId);
				setStarted(held.app);
				console.info(said(STARTED));
			},
			(failure: unknown) => console.error(said(ROUTES_FAILED).replace("{reason}", String(failure))),
		);
		return () => {
			held.isStopped = true;
			held.app?.stop();
			held.routes?.release();
			setStarted(null);
		};
	}, [routesFor, appId, tabId]);
	return started;
}

function appOver({ routes }: FrameRoutes, appId: string): StartedApp {
	const transport = relayTransportOf(routes, appId);
	return app()
		.imports(...routes.map(({ module }) => module.over(transport)))
		.start();
}
