import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useTabFace } from "@sumi/sumi-host-plugin";
import { Button, Icon, PopoverItem } from "@widgetarium/kit";
import type { FlowTab } from "../../../../shared/lib/flow-board-types.js";
import { tabLabelOf } from "../../lib/tab-look.js";
import { SpotMenu } from "../spot-menu/spot-menu.js";
import type { MenuSpot } from "../spot-menu/spot-menu.js";

export interface OverflowMenuProps {
	readonly tabs: readonly FlowTab[];
	readonly artOf: (tab: FlowTab) => string;
	readonly onShow: (tabId: string) => void;
}

const MORE_LABEL = "More tabs";

export function OverflowMenu({ tabs, artOf, onShow }: OverflowMenuProps): ReactElement {
	const [at, setAt] = useState<MenuSpot | null>(null);
	const TabFace = useTabFace();
	return (
		<span className="sumi-pane-tabs-more">
			<Button
				shape="square"
				emphasis="ghost"
				size="xs"
				label={MORE_LABEL}
				title={MORE_LABEL}
				onClick={(event) => {
					const { left, bottom } = event.currentTarget.getBoundingClientRect();
					setAt({ x: left, y: bottom });
				}}
			>
				<Icon name="chevron-down" />
			</Button>
			<SpotMenu at={at} onClose={() => setAt(null)}>
				{() => (
					<div role="menu" aria-label={MORE_LABEL}>
						{tabs.map((tab) => (
							<PopoverItem
								key={tab.id}
								role="menuitem"
								icon={
									<TabFace
										art={artOf(tab)}
										favicon={null}
										title={tabLabelOf(tab)}
										address={tab.address}
										mark={tab.mark}
									/>
								}
								onClick={() => {
									setAt(null);
									onShow(tab.id);
								}}
							>
								{tabLabelOf(tab)}
							</PopoverItem>
						))}
					</div>
				)}
			</SpotMenu>
		</span>
	);
}
