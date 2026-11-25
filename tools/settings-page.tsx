import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { RuntimeProvider, runtime } from "@widgetarium/data-framework";
import { StoreClient, memoryStoreInvoke } from "../packages/shared/behaviors/tauri-store.ts";
import { appearance as appearanceModule } from "../packages/state/appearance/generated/module.ts";
import { plugins as registryModule } from "../packages/state/plugin-registry/generated/module.ts";
import { workspaces as workspacesModule } from "../packages/domain/workspaces/generated/module.ts";
import { WindowAppContext } from "../plugins/settings/src/shared/lib/window-app-context.ts";
import { settingsPageOf } from "../plugins/settings/src/features/settings/ui/settings-page/settings-page.tsx";
import { AppearancePage } from "../plugins/appearance-settings/src/features/appearance/ui/appearance-page/appearance-page.tsx";
import { PluginsPage } from "../plugins/plugins-catalog/src/features/catalog/ui/plugins-page/plugins-page.tsx";
import { placesOver } from "./places-fixture.ts";
import { boardWorkspacesParts } from "./board-workspaces-fixture.ts";
import { pageGlobal } from "./page-harness.ts";

const asked = new URLSearchParams(location.search);
const catalogue: unknown = pageGlobal("__CATALOGUE__");
const entries = Array.isArray(catalogue) ? catalogue : [];
const startedIds = entries.map((entry) => entry.id);

const app = runtime()
	.modules(
		registryModule({ catalogue: entries, startedIds, tauri: { store: new StoreClient(memoryStoreInvoke()) } }),
		appearanceModule({
			systemScheme: { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined },
		}),
		workspacesModule({ injects: boardWorkspacesParts("board") }),
	)
	.imports(...placesOver())
	.start({ platform: "browser", scope: { workspaceId: "fixture" } });

const Settings = settingsPageOf([
	{
		id: "appearance",
		title: "Appearance",
		icon: "palette",
		group: "sumi",
		order: 10,
		keywords: ["theme", "font"],
		view: AppearancePage,
	},
	{ id: "plugins", title: "Plugins", icon: "plug", group: "extend", order: 10, keywords: ["build"], view: PluginsPage },
]);

const host = document.getElementById("root");

if (host !== null) {
	host.style.width = `${asked.get("w") ?? "1160"}px`;
	host.style.height = "1400px";
	createRoot(host).render(
		<RuntimeProvider runtime={app}>
			<WindowAppContext.Provider value={app}>
				<Settings app="settings" tabId="settings" />
			</WindowAppContext.Provider>
		</RuntimeProvider>,
	);
}
