import type { McpServer } from "@widgetarium/data-framework";
import { ToolLabelSchema } from "../../shared/schema/tool-label.schema.js";
import type { ToolLabel } from "../../shared/schema/tool-label.schema.js";
import { ToolLabelsGateway } from "./tool-labels.gateway.js";
import type { ServedToolName } from "./tool-labels.gateway.js";

export class ServedToolLabelsGateway extends ToolLabelsGateway {
	constructor(private readonly servers: readonly McpServer[]) {
		super();
	}

	labelOf({ server, tool }: ServedToolName): ToolLabel | null {
		const served = this.servers.find(({ name }) => name === server)?.tools.find(({ name }) => name === tool);
		if (served?._meta === undefined) {
			return null;
		}

		const parsed = ToolLabelSchema.safeParse(served._meta);

		if (!parsed.success) {
			console.warn(`[assistant] ${server}/${tool}: metadata.mcp is not a tool label: ${parsed.error.message}`);
			return null;
		}

		return parsed.data;
	}
}
