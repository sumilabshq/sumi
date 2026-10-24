import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CallChange, DiffSign } from "@widgetarium/core/engine/assistant-port.js";
import { LineCounts } from "./line-counts.js";

const SIGN_MARK: Readonly<Record<DiffSign, string>> = {
	added: "+",
	removed: "−",
	kept: " ",
};

export function DiffCard({ change }: { readonly change: CallChange }): ReactElement {
	return (
		<div className="wg-studio-ai-diff">
			<div className="wg-studio-ai-diff-head">
				<span className="wg-studio-ai-diff-file">{change.file}</span>
				<LineCounts added={change.added} removed={change.removed} />
			</div>
			<div className="wg-studio-ai-diff-lines">
				{change.lines.map((line, at) => (
					<div className={`wg-studio-ai-diff-line is-${line.sign}`} key={at}>
						{`${SIGN_MARK[line.sign]} ${line.text}`}
					</div>
				))}
			</div>
		</div>
	);
}
