import type { McpServer } from "@widgetarium/data-framework";
import { ToolLabelSchema } from "../../shared/schema/tool-label.schema.js";
import type { ToolLabel } from "../../shared/schema/tool-label.schema.js";
import { ToolViewSchema, VIEW_SCHEME } from "../../shared/schema/tool-view.schema.js";
import { ToolLabelsGateway } from "./tool-labels.gateway.js";
import type { ServedToolName } from "./tool-labels.gateway.js";

const LABEL_KEY = "kind";
const VIEW_KEY = "ui";

export class ServedToolLabelsGateway extends ToolLabelsGateway {
	constructor(private readonly servers: readonly McpServer[]) {
		super();
	}

	labelOf(named: ServedToolName): ToolLabel | null {
		const meta = this.metaOf(named);

		if (meta === null || !(LABEL_KEY in meta)) {
			return null;
		}

		const parsed = ToolLabelSchema.safeParse(meta);

		if (!parsed.success) {
			console.warn(`[assistant] ${named.server}/${named.tool}: metadata.mcp is not a tool label: ${parsed.error.message}`);
			return null;
		}

		return parsed.data;
	}

	viewOf(named: ServedToolName): string | null {
		const meta = this.metaOf(named);

		if (meta === null || !(VIEW_KEY in meta)) {
			return null;
		}

		const parsed = ToolViewSchema.safeParse(meta);

		if (!parsed.success) {
			console.warn(`[assistant] ${named.server}/${named.tool}: metadata.mcp.ui names no ${VIEW_SCHEME} view: ${parsed.error.message}`);
			return null;
		}

		return parsed.data.ui.resourceUri.slice(VIEW_SCHEME.length);
	}

	private metaOf({ server, tool }: ServedToolName): Readonly<Record<string, unknown>> | null {
		const served = this.servers.find(({ name }) => name === server)?.tools.find(({ name }) => name === tool);
		return served?._meta ?? null;
	}
}
