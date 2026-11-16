import { apps as appsContract } from "@sumi/apps/contract";
import { apps as appsModule } from "@sumi/apps/implementation";
import { backend, shell } from "@sumi/sumi-host-plugin";
import { agent } from "@sumi/agent-plugin";
import { tabs as tabsTools } from "@sumi/tabs/implementation";
import { navigation } from "@sumi/navigation-plugin";
import { tabGroups } from "@sumi/tab-groups-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { appsTabPageOf } from "./features/app-tab/ui/app-tab/apps-tab-page.js";
import type { FilledApp } from "./features/app-tab/ui/app-tab/app-tab.js";
import { faceOf } from "./features/app-tab/lib/face-of.js";
import { placedAppOf } from "./features/app-tab/lib/placed-app-of.js";
import { titlesOfApps } from "./features/app-tab/lib/titles-of-apps.js";
import { appLinkGuidesOf } from "./features/app-tab/lib/app-link-guides.js";

export const apps = plugin("apps")
	.require(backend, shell, agent, navigation, tabGroups)
	.apply((app) => {
		const filled: FilledApp[] = [];
		const tabs = app.use(navigation);
		app
			.use(backend)
			.moduleOf(
				({ store }) => appsModule({ apps: filled.map(faceOf), titlesOf: titlesOfApps(filled), store }),
				appsContract,
			);
		app.use(shell).tabPage(appsTabPageOf(filled));
		app.use(agent).mcp.addServer({ name: "apps", modules: [tabsTools] });
		app.use(agent).addPromptPart(() => appLinkGuidesOf(filled));
		return {
			app: (entry: FilledApp): void => {
				filled.push(entry);
				tabs.app(placedAppOf(entry));
			},
		};
	});
