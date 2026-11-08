import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";

export const PLUGIN_WINDOW_MODULES = startSumiPlugins(builtInPluginState())
	.windowModules.map((windowModule) => windowModule.moduleOf({}))
	.filter(({ definition }) => definition.name !== "app-host");
