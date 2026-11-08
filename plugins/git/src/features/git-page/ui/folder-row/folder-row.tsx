import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ChangeNums } from "../change-nums/change-nums.js";
import { Glyph } from "../glyph/glyph.js";

export interface FolderRowProps {
	readonly name: string;
	readonly depth: number;
	readonly isOpen: boolean;
	readonly added: number;
	readonly removed: number;
	onToggle(): void;
}

const ROW_INSET_PX = 10;
const DEPTH_STEP_PX = 16;

export function FolderRow({ name, depth, isOpen, added, removed, onToggle }: FolderRowProps): ReactElement {
	return (
		<button
			className="wg-git-row wg-git-folder wg-git-tree-row"
			style={{ paddingLeft: ROW_INSET_PX + depth * DEPTH_STEP_PX }}
			aria-expanded={isOpen}
			onClick={onToggle}
		>
			<span className="wg-git-fold-mark">
				<Glyph name="chevronRight" size={14} />
			</span>
			<Glyph name="folder" />
			<span className="wg-git-nm is-fill">{name}</span>
			<ChangeNums added={added} removed={removed} hidesZero />
		</button>
	);
}
