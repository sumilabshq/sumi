import { BackgroundModuleSchema } from "@sumi/sumi-host-plugin";
import { slot } from "@widgetarium/plugin-framework";

export const McpModuleSchema = BackgroundModuleSchema.pick({
	module: true,
	contract: true,
});

export const mcpModules = slot().item(McpModuleSchema).list();
