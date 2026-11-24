import { createElement as h } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import type { FlowTab } from "../../../../shared/lib/flow-board-types.js";
import type { TabFit } from "../../lib/tab-fit.js";
import { tabLabelOf } from "../../lib/tab-look.js";
import { PaneTab } from "../pane-tab/pane-tab.js";

export interface PaneTabListProps {
	readonly tabs: readonly FlowTab[];
	readonly fit: TabFit;
	readonly activeId: string | null;
	readonly renamingId: string | null;
	readonly liftedId: string | null;
	readonly artOf: (tab: FlowTab) => string;
	readonly onShow: (tabId: string) => void;
	readonly onClose: (tabId: string) => void;
	readonly onMenu: (tabId: string, event: MouseEvent<HTMLElement>) => void;
	readonly onPress: (tab: { readonly id: string; readonly label: string }, event: PointerEvent<HTMLElement>) => void;
	readonly onRenameStart: (tabId: string) => void;
	readonly onRenamed: (tabId: string, label: string | null) => void;
}

export function PaneTabList(props: PaneTabListProps): ReactElement {
	const { fit, activeId, renamingId, liftedId } = props;
	return (
		<div className="sumi-pane-tabs-list">
			{props.tabs
				.filter(({ id }) => fit.shown.includes(id))
				.map((tab) => (
					<PaneTab
						key={tab.id}
						tab={tab}
						art={props.artOf(tab)}
						isActive={tab.id === activeId}
						isLabelled={fit.labelled.has(tab.id) || tab.id === renamingId}
						isRenaming={tab.id === renamingId}
						isLifted={tab.id === liftedId}
						onShow={() => props.onShow(tab.id)}
						onClose={() => props.onClose(tab.id)}
						onMenu={(event) => props.onMenu(tab.id, event)}
						onPress={(event) => props.onPress({ id: tab.id, label: tabLabelOf(tab) }, event)}
						onRenameStart={() => props.onRenameStart(tab.id)}
						onRenamed={(label) => props.onRenamed(tab.id, label)}
					/>
				))}
		</div>
	);
}
