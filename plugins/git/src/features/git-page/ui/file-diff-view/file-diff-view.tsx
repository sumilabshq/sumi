import { createElement as h, useCallback, useState } from "react";
import type { ReactElement } from "react";
import type { DiffRange, FileDiff } from "@sumi/git";
import { placeholderHeightOf } from "../../lib/diff-rows.js";
import { anchorOf } from "../../lib/git-names.js";
import { useReportsHeight } from "../../lib/use-reports-height.js";
import { FileDiffHead } from "./file-diff-head.js";
import { TrackedBody } from "./tracked-body.js";
import { UntrackedBody } from "./untracked-body.js";

export interface FileDiffViewProps {
	readonly file: FileDiff;
	readonly folder: string;
	readonly range: DiffRange;
	readonly isViewed: boolean;
	readonly isNear: boolean;
	readonly heldHeight: number | undefined;
	onHeight(path: string, px: number): void;
	onToggleViewed(): void;
}

const HEAD_PX = 40;
const OPEN_LINE_LIMIT = 400;

export function FileDiffView({
	file,
	folder,
	range,
	isViewed,
	isNear,
	heldHeight,
	onHeight,
	onToggleViewed,
}: FileDiffViewProps): ReactElement {
	const [openOverride, setOpenOverride] = useState<boolean | null>(null);
	const [section, setSection] = useState<HTMLElement | null>(null);
	const isOpen = openOverride ?? (!isViewed && file.added + file.removed <= OPEN_LINE_LIMIT);
	useReportsHeight(
		section,
		useCallback((px: number) => onHeight(file.path, px), [onHeight, file.path]),
	);

	if (!isNear) {
		return (
			<section
				className="wg-git-file"
				id={anchorOf(file.path)}
				data-path={file.path}
				style={{ height: heldHeight ?? HEAD_PX + (isOpen ? placeholderHeightOf(file) : 0) }}
			/>
		);
	}

	return (
		<section
			ref={setSection}
			className="wg-git-file"
			id={anchorOf(file.path)}
			data-path={file.path}
		>
			<FileDiffHead
				file={file}
				isOpen={isOpen}
				isViewed={isViewed}
				onFold={() => setOpenOverride(!isOpen)}
				onToggleViewed={() => {
					setOpenOverride(null);
					onToggleViewed();
				}}
			/>
			{isOpen && !file.isUntracked ? <TrackedBody folder={folder} range={range} file={file} /> : null}
			{isOpen && file.isUntracked ? <UntrackedBody folder={folder} path={file.path} /> : null}
		</section>
	);
}
