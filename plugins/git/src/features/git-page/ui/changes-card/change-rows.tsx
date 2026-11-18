import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { ChangeNums } from "../change-nums/change-nums.js";
import { StatusLetter } from "../status-letter/status-letter.js";
import type { FileDiff } from "@sumi/git/contract";

export interface ChangeRowsProps {
	readonly files: readonly FileDiff[];
	onOpen(file: FileDiff): void;
}

const PAGE = 10;
const MORE = "{count} more";
const NOTHING = "No changes here.";

export function ChangeRows({ files, onOpen }: ChangeRowsProps): ReactElement {
	const [shown, setShown] = useState(PAGE);

	if (files.length === 0) {
		return <p className="sumi-changes-card-note">{NOTHING}</p>;
	}

	const left = files.length - shown;
	return (
		<div className="sumi-changes-card-rows">
			{files.slice(0, shown).map((file) => (
				<button key={file.path} type="button" className="wg-git-row sumi-changes-card-row" onClick={() => onOpen(file)}>
					<StatusLetter status={file.status} />
					<span className="wg-git-nm">{file.path.slice(file.path.lastIndexOf("/") + 1)}</span>
					<span className="wg-git-dim">{file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : ""}</span>
					<ChangeNums added={file.added} removed={file.removed} hidesZero={true} />
				</button>
			))}
			{left > 0 ? (
				<button type="button" className="wg-git-row sumi-changes-card-more" onClick={() => setShown(shown + PAGE)}>
					{MORE.replace("{count}", String(left))}
				</button>
			) : null}
		</div>
	);
}
