import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FileDiff } from "@sumi/git";
import { fileFolderOf, fileNameOf } from "../../lib/git-names.js";
import { ChangeNums } from "../change-nums/change-nums.js";
import { Glyph } from "../glyph/glyph.js";
import { StatusLetter } from "../status-letter/status-letter.js";

export interface FileRowProps {
	readonly file: FileDiff;
	readonly isPicked: boolean;
	readonly isViewed: boolean;
	onPick(): void;
}

const ROW = "wg-git-row";
const PICKED = " is-sel";
const VIEWED = " is-seen";

export function FileRow({ file, isPicked, isViewed, onPick }: FileRowProps): ReactElement {
	return (
		<button className={`${ROW}${isPicked ? PICKED : ""}${isViewed ? VIEWED : ""}`} onClick={onPick}>
			<StatusLetter status={file.status} />
			<span className="wg-git-nm">{fileNameOf(file.path)}</span>
			<span className="wg-git-dim">{fileFolderOf(file.path)}</span>
			{isViewed ? (
				<span className="is-faint">
					<Glyph name="tick" size={14} />
				</span>
			) : (
				<ChangeNums added={file.added} removed={file.removed} hidesZero />
			)}
		</button>
	);
}
