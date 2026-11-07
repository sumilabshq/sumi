import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/studio/src/plugins/sumi-plugins.ts";

export const COMMAND_MENU_MODULES = resolvePlugins(BUILT_IN_PROFILE).windowModules;
