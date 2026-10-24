import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/shared/core/src/requests/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { Browser } from "../apps/studio/src/features/browser/ui/browser/browser.tsx";
import type { BrowserTab, RecentSite } from "../packages/domain/browser/shared/schema/browser-tab.schema.ts";
import { fakeBrowser } from "./browser-fakes.ts";
import { pageGlobal, reportsFailures } from "./page-harness.ts";

export interface StateScene {
	readonly id: string;
	readonly width: number;
	readonly height: number;
	readonly tab: Partial<BrowserTab>;
	readonly recentSites: readonly RecentSite[];
	readonly blockedSite: string | null;
}

const STAGE = "wg-root cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";
reportsFailures();

function sceneElement(scene: StateScene): ReturnType<typeof h> {
	const browser = fakeBrowser();
	browser.pages.tab = {
		...browser.pages.tab,
		favicon: null,
		...scene.tab,
	};
	browser.recentSites.saveRecentSites(scene.recentSites);

	if (scene.blockedSite !== null) {
		browser.grants.saveGrants(
			[
				{
					siteKey: scene.blockedSite,
					scope: "host",
					level: "blocked",
					source: "person",
					grantedAt: 0,
					by: "person",
				},
			],
			{
				at: 0,
				siteKey: scene.blockedSite,
				was: null,
				became: "blocked",
				by: "person",
				reason: "measured scene",
			},
		);
	}

	const sceneApp = app().modules(BrowserModule.with(browser.parts)).start();
	return h(
		"div",
		{
			key: scene.id,
			className: STAGE,
			"data-scene": scene.id,
			style: {
				width: scene.width,
				height: scene.height,
				marginBottom: 40,
			},
		},
		h(AppProvider, { app: sceneApp }, h(Browser, {})),
	);
}

const scenes = pageGlobal("__SCENES__");
const host = document.getElementById("root");

if (host !== null && Array.isArray(scenes)) {
	createRoot(host).render(
		h(
			"div",
			{ className: "wg-studio is-canvas", style: { display: "block" } },
			h("main", { className: "wg-studio-outlet", style: { display: "block" } }, scenes.map(sceneElement)),
		),
	);
}
