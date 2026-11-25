import type { ServerSideModule } from "@widgetarium/data-framework";
import { fileSystem } from "@widgetarium/file-system/implementation";
import { haptics } from "@widgetarium/haptics/implementation";
import { terminal } from "@widgetarium/terminal/implementation";

export const HOST_CAPABILITY_MODULES: readonly ServerSideModule[] = [fileSystem, terminal, haptics];

export function isHostCapability(module: ServerSideModule): boolean {
	return HOST_CAPABILITY_MODULES.some((capability) => capability === module);
}
