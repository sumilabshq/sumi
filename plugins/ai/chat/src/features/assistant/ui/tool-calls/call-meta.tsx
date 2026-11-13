import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CallMeta } from "@widgetarium/core/engine/assistant-port.js";
import { LineCounts } from "./line-counts.js";

interface MetaSaid {
	readonly className: string;
	readonly said: string;
}

const PASSED = "passed";
const FAILED = "failed";

export function CallMetaSaid({ meta }: { readonly meta: CallMeta }): ReactElement {
	if (meta.kind === "change") {
		return <LineCounts added={meta.added} removed={meta.removed} />;
	}

	const { className, said } = metaSaidOf(meta);
	return <span className={className}>{said}</span>;
}

function metaSaidOf(meta: Exclude<CallMeta, { readonly kind: "change" }>): MetaSaid {
	if (meta.kind === "count") {
		return {
			className: "wg-studio-ai-call-meta",
			said: meta.said,
		};
	}

	return {
		className: meta.passed ? "wg-studio-ai-chip is-passed" : "wg-studio-ai-chip is-failed",
		said: meta.passed ? PASSED : FAILED,
	};
}
