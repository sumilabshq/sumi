import type { TabModules, TabPageProps, WindowOffers } from "@sumi/sumi-host-plugin";
import type { DeviceModule, RemoteModule } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { mascot } from "@widgetarium/mascot/implementation";

export type ChatPageImportOf = (offers: WindowOffers) => RemoteModule;

export type ChatPageModuleOf = (offers: WindowOffers) => DeviceModule;

export interface ChatPageParts {
	readonly imports: readonly ChatPageImportOf[];
	readonly modules: readonly ChatPageModuleOf[];
}

export function chatModulesOf({
	imports,
	modules,
}: ChatPageParts): (tab: TabPageProps, offers: WindowOffers) => Promise<TabModules> {
	return (_tab, offers) =>
		Promise.resolve({
			modules: [mascot, ...modules.map((moduleOf) => moduleOf(offers))],
			imports: [...imports.map((importOf) => importOf(offers)), assistant({ over: offers.windowServer })],
		});
}
