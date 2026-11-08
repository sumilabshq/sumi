import type { ServerSideModule } from "@widgetarium/data-framework";
import { fileSystem } from "@widgetarium/file-system/module";
import { terminal } from "@widgetarium/terminal/module";

export const HOST_CAPABILITY_MODULES: readonly ServerSideModule[] = [fileSystem, terminal];

export function isHostCapability(module: ServerSideModule): boolean {
	return HOST_CAPABILITY_MODULES.some((capability) => capability === module);
}
