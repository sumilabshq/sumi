import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FileDiff } from "@sumi/git";
import { IconButton, tooltipMarks } from "@widgetarium/kit";
import { fileFolderOf, fileNameOf } from "../../lib/git-names.js";
import { ChangeNums } from "../change-nums/change-nums.js";
import { Glyph } from "../glyph/glyph.js";
import { StatusLetter } from "../status-letter/status-letter.js";

export interface FileDiffHeadProps {
	readonly file: FileDiff;
	readonly isOpen: boolean;
	readonly isViewed: boolean;
	onFold(): void;
	onToggleViewed(): void;
}

const MARK_VIEWED = "Mark as viewed";
const VIEWED = "Viewed, press to unmark";

export function FileDiffHead({ file, isOpen, isViewed, onFold, onToggleViewed }: FileDiffHeadProps): ReactElement {
	const viewedLabel = isViewed ? VIEWED : MARK_VIEWED;
	return (
		<div
			className="wg-git-fhead"
			role="button"
			tabIndex={0}
			aria-expanded={isOpen}
			onClick={onFold}
			onKeyDown={(press) => {
				if (press.target === press.currentTarget && (press.key === "Enter" || press.key === " ")) {
					press.preventDefault();
					onFold();
				}
			}}
		>
			<span className="wg-git-fold">
				<Glyph name={isOpen ? "chevronDown" : "chevronRight"} size={14} />
			</span>
			<span className="wg-git-ftitle">
				<StatusLetter status={file.status} />
				<span className="wg-git-fpath">
					<span className="wg-git-dir">{fileFolderOf(file.path)}</span>
					<span className="wg-git-base">{fileNameOf(file.path)}</span>
				</span>
				<ChangeNums added={file.added} removed={file.removed} hidesZero={false} />
			</span>
			<span className="wg-git-gap" />
			<IconButton
				variant="ghost"
				size="xs"
				label={viewedLabel}
				{...tooltipMarks({ said: viewedLabel, keys: null })}
				onClick={(click) => {
					click.stopPropagation();
					onToggleViewed();
				}}
			>
				<Glyph name={isViewed ? "tick" : "circle"} />
			</IconButton>
		</div>
	);
}
