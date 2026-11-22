import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import type { AssistantCall } from "@widgetarium/core/engine/assistant-port.js";
import type { AddedView } from "../../lib/added-views.js";
import { ViewBoundary } from "../view-boundary/view-boundary.js";

export interface CallViewProps {
	readonly call: AssistantCall;
	readonly view: AddedView;
}

export function CallView({ call, view }: CallViewProps): ReactElement | null {
	const drawn = useMemo(() => (call.answered && !call.failed ? view.drawnOf(call.output) : null), [call, view]);

	if (call.failed) {
		return null;
	}

	if (!call.answered) {
		return (
			<div className="sumi-mcp-app" data-mcp-app={view.name} data-mcp-app-waiting="" style={{ height: view.height }} />
		);
	}

	if (drawn === null) {
		return null;
	}

	return (
		<div className="sumi-mcp-app" data-mcp-app={view.name}>
			<ViewBoundary name={view.name}>{drawn}</ViewBoundary>
		</div>
	);
}
