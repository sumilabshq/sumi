import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { OnRefused } from "@widgetarium/data-framework";
import { Button, Icon } from "@widgetarium/kit";
import type { FlowTab } from "../../../../shared/lib/flow-board-types.js";
import { PANE_ROW_ATTRIBUTE } from "../../../../shared/lib/pane-dom.js";
import { tabFitOf } from "../../lib/tab-fit.js";
import { tabMenuSpotOf } from "../../lib/tab-menu-spot.js";
import { useTabArt } from "../../lib/tab-look.js";
import { usePaneTabActs } from "../../lib/use-pane-tab-acts.js";
import type { PaneTabActs } from "../../lib/use-pane-tab-acts.js";
import { useRowWidth } from "../../lib/use-row-width.js";
import { useTabDrag } from "../../lib/use-tab-drag.js";
import { OverflowMenu } from "../overflow-menu/overflow-menu.js";
import { PaneTabList } from "../pane-tab-list/pane-tab-list.js";
import { PaneTabMenu } from "../pane-tab-menu/pane-tab-menu.js";
import type { TabMenuAt, TabMenuActs } from "../pane-tab-menu/pane-tab-menu.js";
import { TabDragLayer } from "../tab-drag-layer/tab-drag-layer.js";

export interface PaneTabRowProps {
	readonly flowId: string;
	readonly paneId: string;
	readonly tabs: readonly FlowTab[];
	readonly activeTabId: string | null;
}

const NOTICE_MS = 4000;
const SAVED_SETUP = "Saved as a setup";
const NEW_TAB_LABEL = "New tab";

export function PaneTabRow(props: PaneTabRowProps): ReactElement {
	const [notice, setNotice] = useState<string | null>(null);
	useEffect(() => {
		if (notice === null) {
			return undefined;
		}

		const timer = setTimeout(() => setNotice(null), NOTICE_MS);
		return () => clearTimeout(timer);
	}, [notice]);
	return (
		<OnRefused value={({ reason }) => setNotice(reason)}>
			<PaneTabRowBody {...props} notice={notice} onNotice={setNotice} />
		</OnRefused>
	);
}

interface BodyProps extends PaneTabRowProps {
	readonly notice: string | null;
	readonly onNotice: (notice: string | null) => void;
}

function PaneTabRowBody({ flowId, paneId, tabs, activeTabId, notice, onNotice }: BodyProps): ReactElement {
	const row = useRef<HTMLDivElement | null>(null);
	const width = useRowWidth(row);
	const acts = usePaneTabActs({ flowId, paneId, tabs });
	const artOf = useTabArt();
	const drag = useTabDrag({ onDrop: acts.drop });
	const [menu, setMenu] = useState<TabMenuAt | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const activeId = activeTabId ?? tabs[0]?.id ?? null;
	const fit = tabFitOf({
		width,
		tabIds: tabs.map(({ id }) => id),
		activeId,
	});
	return (
		<div ref={row} className="sumi-pane-tabs" role="tablist" {...{ [PANE_ROW_ATTRIBUTE]: paneId }}>
			<PaneTabList
				tabs={tabs}
				fit={fit}
				activeId={activeId}
				renamingId={renamingId}
				liftedId={drag.lifted?.tabId ?? null}
				artOf={artOf}
				onShow={acts.show}
				onClose={acts.close}
				onMenu={(tabId, event) => {
					event.preventDefault();
					setMenu({ ...tabMenuSpotOf(event), tabId });
				}}
				onPress={drag.press}
				onRenameStart={setRenamingId}
				onRenamed={(tabId, label) => {
					setRenamingId(null);

					if (label !== null) {
						acts.rename(tabId, label);
					}
				}}
			/>
			{fit.hidden.length === 0 ? null : (
				<OverflowMenu tabs={tabs.filter(({ id }) => fit.hidden.includes(id))} artOf={artOf} onShow={acts.show} />
			)}
			<Button
				shape="square"
				emphasis="ghost"
				size="xs"
				label={NEW_TAB_LABEL}
				title={NEW_TAB_LABEL}
				onClick={acts.openHome}
			>
				<Icon name="plus" />
			</Button>
			{notice === null ? null : (
				<span className="sumi-pane-tabs-notice" role="status" title={notice} onClick={() => onNotice(null)}>
					{notice}
				</span>
			)}
			{drag.lifted === null ? null : <TabDragLayer lifted={drag.lifted} />}
			<PaneTabMenu
				at={menu}
				flowId={flowId}
				acts={menuActsOf(acts, { setRenamingId, onNotice })}
				onClose={() => setMenu(null)}
			/>
		</div>
	);
}

interface MenuNeeds {
	readonly setRenamingId: (tabId: string) => void;
	readonly onNotice: (notice: string | null) => void;
}

function menuActsOf(acts: PaneTabActs, { setRenamingId, onNotice }: MenuNeeds): TabMenuActs {
	return {
		rename: setRenamingId,
		duplicate: acts.duplicate,
		splitRight: (tabId) => acts.splitOwn(tabId, "right"),
		splitDown: (tabId) => acts.splitOwn(tabId, "bottom"),
		saveAsSetup: (name) => void acts.saveAsSetup(name).then((isSaved) => isSaved && onNotice(SAVED_SETUP)),
		close: acts.close,
	};
}
