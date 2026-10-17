import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CallChange, DiffLine, DiffSign } from "@widgetarium/core/engine/assistant-port.js";
import { LineCounts } from "./line-counts.js";

const SIGN_MARK: Readonly<Record<DiffSign, string>> = {
	added: "+",
	removed: "−",
	kept: " ",
};

export function DiffCard({ change }: { readonly change: CallChange }): ReactElement {
	return h("div", { className: "wg-studio-ai-diff" }, [
		h("div", { className: "wg-studio-ai-diff-head", key: "head" }, [
			h("span", { className: "wg-studio-ai-diff-file", key: "file" }, change.file),
			h(LineCounts, { key: "counts", added: change.added, removed: change.removed }),
		]),
		h("div", { className: "wg-studio-ai-diff-lines", key: "lines" }, change.lines.map(diffLineOf)),
	]);
}

function diffLineOf(line: DiffLine, at: number): ReactElement {
	return h(
		"div",
		{ className: `wg-studio-ai-diff-line is-${line.sign}`, key: at },
		`${SIGN_MARK[line.sign]} ${line.text}`,
	);
}
