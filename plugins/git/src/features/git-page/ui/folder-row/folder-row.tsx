import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { SidePanelRow } from "@widgetarium/kit";
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

export function FolderRow({ name, depth, isOpen, added, removed, onToggle }: FolderRowProps): ReactElement {
	return (
		<SidePanelRow
			className="wg-git-folder wg-git-tree-row"
			icon={
				<Fragment>
					<span className="wg-git-fold-mark">
						<Glyph name="chevronRight" size={14} />
					</span>
					<Glyph name="folder" />
				</Fragment>
			}
			label={name}
			end={<ChangeNums added={added} removed={removed} hidesZero />}
			depth={depth}
			aria-expanded={isOpen}
			onClick={onToggle}
		/>
	);
}
