import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useTabFace } from "@sumi/sumi-host-plugin";
import { Button, Icon, PopoverItem, SpotMenu } from "@widgetarium/kit";
import type { MenuSpot } from "@widgetarium/kit";
import type { FlowTab } from "../../../../shared/lib/flow-board-types.js";
import { tabLabelOf } from "../../lib/tab-look.js";
import type { TabFaceLook } from "../../lib/tab-look.js";

export interface OverflowMenuProps {
	readonly tabs: readonly FlowTab[];
	readonly faceOf: (tab: FlowTab) => TabFaceLook;
	readonly onShow: (tabId: string) => void;
}

const MORE_LABEL = "More tabs";

export function OverflowMenu({ tabs, faceOf, onShow }: OverflowMenuProps): ReactElement {
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
										{...faceOf(tab)}
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
