import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantCall } from "@widgetarium/core/engine/assistant-port.js";
import { countText } from "@widgetarium/core/engine/count-text.js";
import { failuresIn } from "../../lib/failures-in.js";
import { callsSpanMs, saidElapsed } from "../../lib/spent.js";
import { RoundChevron } from "./round-chevron.js";

export interface ToolsHeadProps {
	readonly calls: readonly AssistantCall[];
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const USED_ONE = "Used 1 tool";
const USED_MANY = "Used {count} tools";
const SOME_FAILED = "{count} failed";

export function ToolsHead({ calls, isOpen, onToggle }: ToolsHeadProps): ReactElement {
	const failed = failuresIn(calls);
	const spanMs = callsSpanMs(calls);
	return (
		<button className="wg-studio-ai-tools-head" type="button" aria-expanded={isOpen} onClick={onToggle}>
			<span className="wg-studio-ai-tools-said">{countText(calls.length, USED_ONE, USED_MANY)}</span>
			{failed === 0 ? null : (
				<span className="wg-studio-ai-tools-failed">{SOME_FAILED.replace("{count}", String(failed))}</span>
			)}
			{spanMs === null ? null : <span className="wg-studio-ai-tools-took">{saidElapsed(spanMs)}</span>}
			<RoundChevron isOpen={isOpen} />
		</button>
	);
}
