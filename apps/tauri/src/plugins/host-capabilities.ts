import type { ServerSideModule } from "@widgetarium/data-framework/server";
import { FileSystemModule } from "@widgetarium/file-system/module";
import { TerminalModule } from "@widgetarium/terminal/module";

export const HOST_CAPABILITY_MODULES: readonly ServerSideModule[] = [FileSystemModule, TerminalModule];

export function isHostCapability(module: ServerSideModule): boolean {
	return HOST_CAPABILITY_MODULES.some((capability) => capability === module);
}
