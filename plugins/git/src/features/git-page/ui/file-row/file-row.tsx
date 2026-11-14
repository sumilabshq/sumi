import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { FileDiff } from "@sumi/git/contract";
import { SidePanelRow } from "@widgetarium/kit";
import { fileFolderOf, fileNameOf } from "../../lib/git-names.js";
import { ChangeNums } from "../change-nums/change-nums.js";
import { Glyph } from "../glyph/glyph.js";
import { StatusLetter } from "../status-letter/status-letter.js";

export interface FileRowProps {
	readonly file: FileDiff;
	readonly depth?: number | undefined;
	readonly isPicked: boolean;
	readonly isViewed: boolean;
	onPick(): void;
}

const VIEWED = "is-seen";
const TREE_ROW = "wg-git-tree-row";

export function FileRow({ file, depth, isPicked, isViewed, onPick }: FileRowProps): ReactElement {
	const isInTree = depth !== undefined;
	return (
		<SidePanelRow
			className={[isInTree ? TREE_ROW : "", isViewed ? VIEWED : ""].join(" ").trim()}
			icon={<StatusLetter status={file.status} />}
			label={
				isInTree ? (
					fileNameOf(file.path)
				) : (
					<Fragment>
						{fileNameOf(file.path)} <span className="wg-git-dim">{fileFolderOf(file.path)}</span>
					</Fragment>
				)
			}
			end={
				isViewed ? <Glyph name="tick" size={14} /> : <ChangeNums added={file.added} removed={file.removed} hidesZero />
			}
			depth={depth ?? 0}
			isPicked={isPicked}
			onClick={onPick}
		/>
	);
}
