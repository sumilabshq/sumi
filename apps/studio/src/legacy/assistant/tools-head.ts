import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantCall } from "@widgetarium/core/engine/assistant-port.js";
import { countText } from "@widgetarium/core/engine/count-text.js";
import { RoundChevron } from "./round-chevron.js";
import { callsSpanMs, saidElapsed } from "./spent.js";

export interface ToolsHeadProps {
	readonly calls: readonly AssistantCall[];
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const USED_ONE = "Used 1 tool";
const USED_MANY = "Used {count} tools";
const SOME_FAILED = "{count} failed";

export function ToolsHead({ calls, isOpen, onToggle }: ToolsHeadProps): ReactElement {
	const press = { className: "wg-studio-ai-tools-head", type: "button", "aria-expanded": isOpen, onClick: onToggle };
	return h("button", press, [
		h("span", { className: "wg-studio-ai-tools-said", key: "said" }, countText(calls.length, USED_ONE, USED_MANY)),
		failedPartOf(failuresIn(calls)),
		tookPartOf(callsSpanMs(calls)),
		h(RoundChevron, { key: "mark", isOpen }),
	]);
}

export function failuresIn(calls: readonly { readonly failed: boolean }[]): number {
	return calls.filter((call) => call.failed).length;
}

function failedPartOf(failed: number): ReactElement | null {
	if (failed === 0) {
		return null;
	}

	const said = SOME_FAILED.replace("{count}", String(failed));
	return h("span", { className: "wg-studio-ai-tools-failed", key: "failed" }, said);
}

function tookPartOf(spanMs: number | null): ReactElement | null {
	if (spanMs === null) {
		return null;
	}

	return h("span", { className: "wg-studio-ai-tools-took", key: "took" }, saidElapsed(spanMs));
}
