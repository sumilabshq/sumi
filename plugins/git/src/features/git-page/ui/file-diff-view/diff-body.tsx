import { createElement as h, Fragment, useMemo } from "react";
import type { ReactElement } from "react";
import type { FileDiff } from "@sumi/git";
import { diffRowsOf } from "../../lib/diff-rows.js";
import { GitNote } from "../git-note/git-note.js";
import { Glyph } from "../glyph/glyph.js";

export interface DiffBodyProps {
	readonly file: FileDiff;
}

const BINARY = "Binary file, not shown.";
const CUT = "The rest of this file is cut: it is too long to show.";
const HIDDEN = "{count} unchanged lines";
const ONE_HIDDEN = "1 unchanged line";
const SIGNS = {
	context: "",
	added: "+",
	removed: "−",
} as const;

export function DiffBody({ file }: DiffBodyProps): ReactElement {
	const rows = useMemo(() => diffRowsOf(file.hunks), [file.hunks]);

	if (file.isBinary) {
		return <GitNote said={BINARY} />;
	}

	return (
		<Fragment>
			{rows.map((row, index) =>
				row.kind === "gap" ? (
					<div key={index} className="wg-git-hidden">
						<Glyph name="unfold" size={14} />
						{row.hidden === 1 ? ONE_HIDDEN : HIDDEN.replace("{count}", String(row.hidden))}
					</div>
				) : (
					<div key={index} className="wg-git-ln" data-line={row.line}>
						<span className="wg-git-n">{row.oldNo ?? ""}</span>
						<span className="wg-git-n">{row.newNo ?? ""}</span>
						<span className="wg-git-s">{SIGNS[row.line]}</span>
						<code className="wg-git-code">{row.text}</code>
					</div>
				),
			)}
			{file.isCut ? <p className="wg-git-note">{CUT}</p> : null}
		</Fragment>
	);
}
