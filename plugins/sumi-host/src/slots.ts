import type { ComponentType } from "react";
import { z } from "zod";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { ModuleContract } from "@widgetarium/data-framework";
import type { ServerRuns } from "@widgetarium/data-framework";
import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { slot } from "@widgetarium/plugin-framework";
import type { SlotReader } from "@widgetarium/plugin-framework";
import type { BoardFile } from "@widgetarium/tasks/module";

export interface CoreOffers extends SlotReader {
	readonly store: StoreClient;
	readonly file: BoardFile;
}

export type BackgroundModuleOf = (offers: CoreOffers) => ServerSideModule;

export interface TabPageProps {
	readonly app: string;
	readonly tabId: string;
}

export interface DrawnTabPage {
	readonly page: ComponentType<TabPageProps>;
	draws(app: string): boolean;
}

export type TabPageOf = (offers: SlotReader) => DrawnTabPage;

const NOT_A_MODULE_OF =
	"a background module is a function of what the core offers, answering a module(...) configured from it";
const NOT_A_CONTRACT = 'a background module names its contract, the module(...) descriptor of its package\'s "." entry';
const NOT_A_TAB_PAGE_OF = "a tab page is a function of the plugin's slot reader, answering { page, draws }";

export const BackgroundModuleSchema = z.object({
	module: z.custom<BackgroundModuleOf>((value) => typeof value === "function", NOT_A_MODULE_OF),
	contract: z.custom<ModuleContract<ServerRuns>>((value) => value instanceof ModuleContract, NOT_A_CONTRACT),
});

export const BackgroundModulesSlot = slot("background-modules").item(BackgroundModuleSchema).list();

export const TabPageSchema = z.object({
	tabPage: z.custom<TabPageOf>((value) => typeof value === "function", NOT_A_TAB_PAGE_OF),
});

export const TabPageSlot = slot("tab-page").item(TabPageSchema);
