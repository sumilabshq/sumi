import { z } from "zod";
import type { ExposedRequest } from "./exposure";

export interface McpTool {
	readonly name: string;
	readonly description?: string;
	readonly inputSchema: Readonly<Record<string, unknown>>;
}

type ToolInputShape = "none" | "fields" | "wrapped";

export interface ServedTool {
	readonly tool: McpTool;
	readonly requestName: string;
	readonly inputShape: ToolInputShape;
	readonly isCommand: boolean;
}

const WRAPPED_FIELD = "input";
const NO_FIELDS = {
	type: "object",
	properties: {},
};
const TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;
const BAD_TOOL_NAME =
	"{request} becomes the MCP tool {tool}, which is not 1 to 64 letters, digits, _ or -: shorten its module, feature or name";

export function servedToolsOf(requests: readonly ExposedRequest[]): ReadonlyMap<string, ServedTool> {
	return new Map(
		requests.map((exposed) => {
			const served = servedToolOf(exposed);
			refuseToolName(served);
			return [served.tool.name, served];
		}),
	);
}

export function toolsOf(served: ReadonlyMap<string, ServedTool>): readonly McpTool[] {
	return [...served.values()].map(({ tool }) => tool);
}

export function inputOf({ inputShape }: ServedTool, args: Readonly<Record<string, unknown>>): unknown {
	if (inputShape === "none") {
		return undefined;
	}

	return inputShape === "fields" ? args : args[WRAPPED_FIELD];
}

function servedToolOf({ name, request }: ExposedRequest): ServedTool {
	const { inputShape, inputSchema } = toolInputOf(request.inputSchema);
	const description = request.metadata()["description"];
	return {
		tool: {
			name: name.split(".").join("_"),
			inputSchema,
			...(typeof description === "string" ? { description } : {}),
		},
		requestName: name,
		inputShape,
		isCommand: request.kind === "command",
	};
}

function refuseToolName({ tool, requestName }: ServedTool): void {
	if (TOOL_NAME.test(tool.name)) {
		return;
	}

	throw new Error(BAD_TOOL_NAME.replace("{request}", requestName).replace("{tool}", tool.name));
}

function toolInputOf(schema: z.ZodType): Pick<McpTool, "inputSchema"> & { readonly inputShape: ToolInputShape } {
	if (schema instanceof z.ZodVoid) {
		return {
			inputShape: "none",
			inputSchema: NO_FIELDS,
		};
	}

	// TRADE-OFF: an unrepresentable input becomes {}, so the tool still mounts; the request parses its input anyway
	const { $schema: _dialect, ...json } = z.toJSONSchema(schema, {
		io: "input",
		unrepresentable: "any",
	});

	if (json.type === "object") {
		return {
			inputShape: "fields",
			inputSchema: json,
		};
	}

	return {
		inputShape: "wrapped",
		inputSchema: {
			type: "object",
			properties: { [WRAPPED_FIELD]: json },
			required: [WRAPPED_FIELD],
		},
	};
}
