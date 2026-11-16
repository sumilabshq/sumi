import { builtInPluginState, startSumiPlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";

const BUILT_IN_PLUGINS = startSumiPlugins(builtInPluginState());
const FIXTURE_IMPORTED = ["navigation", "tab-groups", "chat-facts", "apps"];
const UNREACHED_BACKGROUND = BUILT_IN_PLUGINS.backgroundModules
	.map(({ contract }) => contract.name)
	.filter((name) => !FIXTURE_IMPORTED.includes(name));

export const PLUGIN_WINDOW_MODULES = BUILT_IN_PLUGINS.windowModules
	.map((windowModule) => windowModule.moduleOf({}))
	.filter(({ definition }) => definition.name !== "app-host")
	.filter(({ definition }) => !definition.importedModuleNames.some((name) => UNREACHED_BACKGROUND.includes(name)));
