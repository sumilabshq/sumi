import type { TabModules, TabPageProps, WindowOffers } from "@sumi/sumi-host-plugin";
import type { RemoteModule } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { mascot } from "@widgetarium/mascot/implementation";

export type ChatPageImportOf = (offers: WindowOffers) => RemoteModule;

export function chatModulesOf(
	pageImports: readonly ChatPageImportOf[],
): (tab: TabPageProps, offers: WindowOffers) => Promise<TabModules> {
	return (_tab, offers) =>
		Promise.resolve({
			modules: [mascot],
			imports: [...pageImports.map((importOf) => importOf(offers)), assistant({ over: offers.windowServer })],
		});
}
