import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";

export const PLUGIN_WINDOW_MODULES = resolvePlugins(BUILT_IN_PROFILE)
	.windowModules.map((windowModule) => windowModule.moduleOf({}))
	.filter(({ definition }) => definition.name !== "app-host");
