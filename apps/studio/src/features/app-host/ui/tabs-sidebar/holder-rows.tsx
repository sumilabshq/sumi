import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { FoldTabCommand } from "@widgetarium/app-host";
import { FoldBox } from "../fold-box/fold-box.js";
import type { RowFold } from "../tab-row/fold-chevron.js";
import { TabRow } from "../tab-row/tab-row.js";
import { HolderChildren } from "./holder-children.js";
import type { HolderEntryProps } from "./holder-entry.js";

export function HolderRows({
	holder,
	children,
	groupId,
	splitId = null,
	renaming,
	badge = null,
}: HolderEntryProps): ReactElement {
	const foldTab = useCommand(FoldTabCommand);
	const isFolded = holder.isFolded ?? false;
	const fold: RowFold | null =
		children.length === 0 ? null : { isFolded, onToggle: () => void foldTab.run({ id: holder.tab.id }) };
	return (
		<Fragment>
			<TabRow
				item={holder}
				groupId={groupId}
				splitId={splitId}
				place="top"
				isRenaming={renaming.id === holder.tab.id}
				onRenamed={renaming.onRenamed}
				badge={badge}
				fold={fold}
			/>
			{children.length === 0 ? null : (
				<FoldBox isOpen={!isFolded}>
					<HolderChildren holderId={holder.tab.id} children={children} renaming={renaming} />
				</FoldBox>
			)}
		</Fragment>
	);
}
