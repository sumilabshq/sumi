import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import type { ServedToolName } from "../../../gateways/tool-labels/tool-labels.gateway.js";
import type { ToolLabel } from "../../../shared/schema/tool-label.schema.js";

const MCP_TOOL = /^mcp__(.+?)__(.+)$/;
const PATH_KEY = "path";

export function servedToolNameOf(callName: string): ServedToolName | null {
	const [, server, tool] = MCP_TOOL.exec(callName) ?? [];
	return server === undefined || tool === undefined ? null : { server, tool };
}

export function labelledFaceOf(call: AssistantCall, face: CallFace, label: ToolLabel | null): CallFace {
	if (label === null) {
		return face;
	}

	return {
		...face,
		kind: label.kind,
		verb: label.done,
		doing: label.running,
		object: label.shows === undefined ? "" : shownOf(call.input[label.shows], label.shows),
		isCodeObject: label.kind === "run",
	};
}

function shownOf(value: unknown, key: string): string {
	if (typeof value !== "string" && typeof value !== "number") {
		return "";
	}

	const text = String(value);
	return key === PATH_KEY ? (text.split("/").at(-1) ?? text) : text;
}
