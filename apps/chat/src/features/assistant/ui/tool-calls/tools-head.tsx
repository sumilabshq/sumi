import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { changedLinesOf } from "../../lib/changed-lines.js";
import { failuresIn } from "../../lib/failures-in.js";
import { knownFacesOf } from "../../lib/known-face.js";
import { callsSpanMs, saidElapsed } from "../../lib/spent.js";
import { toolsSummaryOf } from "../../lib/tools-summary.js";
import { LineCounts } from "./line-counts.js";

export interface ToolsHeadProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const SOME_FAILED = "{count} failed";

export function ToolsHead({ calls, faces, isOpen, onToggle }: ToolsHeadProps): ReactElement {
	const failed = failuresIn(calls);
	const spanMs = callsSpanMs(calls);
	const changed = changedLinesOf(faces);
	return (
		<button className="wg-studio-ai-tools-head" type="button" aria-expanded={isOpen} onClick={onToggle}>
			<span className="wg-studio-ai-tools-said">{toolsSummaryOf(knownFacesOf(calls, faces))}</span>
			{changed === null ? null : <LineCounts added={changed.added} removed={changed.removed} />}
			{failed === 0 ? null : (
				<span className="wg-studio-ai-tools-failed">{SOME_FAILED.replace("{count}", String(failed))}</span>
			)}
			{spanMs === null ? null : <span className="wg-studio-ai-tools-took">{saidElapsed(spanMs)}</span>}
			<Icon
				name="chevron-right"
				size={12}
				className={isOpen ? "wg-studio-ai-tools-chevron is-open" : "wg-studio-ai-tools-chevron"}
			/>
		</button>
	);
}
