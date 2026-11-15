import { createElement as h, Fragment } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { AppTabState, SidebarSplitState } from "@widgetarium/app-host/contract";
import { Icon, IconButton, PopoverItem } from "@widgetarium/kit";
import { useTabFace } from "@sumi/sumi-host-plugin";

const SPLIT = "Split";
const UNSPLIT = "Unsplit";
const UNSPLIT_TAB = "Unsplit {title}";
const CLOSE_TAB = "Close {title}";
const ICON_PX = 16;

export interface SplitRowsProps {
	readonly split: SidebarSplitState;
	onDone(): void;
}

export function SplitRows({ split, onDone }: SplitRowsProps): ReactNode {
	const unsplit = useCommand(appHost.splits.unsplit);
	const tabs = split.members.map(({ item }) => item.tab);
	return (
		<>
			<div className="wg-kit-menu-label">{SPLIT}</div>
			{tabs.map((tab) => (
				<SplitMemberRow key={tab.id} tab={tab} onDone={onDone} />
			))}
			<PopoverItem
				role="menuitem"
				className="sumi-split-row"
				onClick={() => {
					onDone();
					void unsplit.run({ tabIds: tabs.map(({ id }) => id) });
				}}
			>
				<span className="sumi-split-row-icon" aria-hidden="true">
					<Icon name="panel-right-close" size={ICON_PX} />
				</span>
				<span className="sumi-split-row-label">{UNSPLIT}</span>
			</PopoverItem>
		</>
	);
}

interface SplitMemberRowProps {
	readonly tab: AppTabState;
	onDone(): void;
}

function SplitMemberRow({ tab, onDone }: SplitMemberRowProps): ReactNode {
	const TabFace = useTabFace();
	const showTab = useCommand(appHost.tabs.showTab);
	const closeTab = useCommand(appHost.tabActions.closeTab);
	const unsplit = useCommand(appHost.splits.unsplit);
	const pressed = (run: () => void) => (click: MouseEvent) => {
		click.stopPropagation();
		onDone();
		run();
	};
	return (
		<div className="sumi-split-member">
			<PopoverItem
				role="menuitem"
				className="sumi-split-row"
				onClick={pressed(() => void showTab.run({ id: tab.id, paneId: null, isFollowingFocus: false }))}
			>
				<span className="sumi-split-row-icon" aria-hidden="true">
					<TabFace art={tab.icon} favicon={tab.favicon} title={tab.title} address={tab.address} mark={tab.mark} />
				</span>
				<span className="sumi-split-row-label">{tab.title}</span>
			</PopoverItem>
			<span className="sumi-split-member-acts">
				<IconButton
					variant="ghost"
					size="xs"
					label={UNSPLIT_TAB.replace("{title}", tab.title)}
					onClick={pressed(() => void unsplit.run({ tabIds: [tab.id] }))}
				>
					<Icon name="panel-right-close" size={ICON_PX} />
				</IconButton>
				<IconButton
					variant="ghost"
					size="xs"
					label={CLOSE_TAB.replace("{title}", tab.title)}
					onClick={pressed(() => void closeTab.run({ id: tab.id }))}
				>
					<Icon name="x" size={ICON_PX} />
				</IconButton>
			</span>
		</div>
	);
}
