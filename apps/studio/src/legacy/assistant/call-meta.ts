import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CallMeta } from "@widgetarium/core/engine/assistant-port.js";
import { LineCounts } from "./line-counts.js";

const PASSED = "passed";
const FAILED = "failed";

export function CallMetaSaid({ meta }: { readonly meta: CallMeta }): ReactElement {
	if (meta.kind === "count") {
		return h("span", { className: "wg-studio-ai-call-meta" }, meta.said);
	}

	if (meta.kind === "change") {
		return h(LineCounts, { added: meta.added, removed: meta.removed });
	}

	return h(
		"span",
		{ className: meta.passed ? "wg-studio-ai-chip is-passed" : "wg-studio-ai-chip is-failed" },
		meta.passed ? PASSED : FAILED,
	);
}
