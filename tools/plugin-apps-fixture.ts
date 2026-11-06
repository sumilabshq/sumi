import { BUILT_IN_PROFILE, resolvePlugins } from "../apps/tauri/src/plugins/sumi-plugins.ts";

export const BUILT_IN_APPS = resolvePlugins(BUILT_IN_PROFILE).apps;
