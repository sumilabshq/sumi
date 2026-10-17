import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { Icon, Popover, PopoverItem } from "@widgetarium/kit";
import { AppTabsQuery, OpenTabCommand } from "../../contract.js";

export interface NewTabMenuProps {
	readonly trigger: ReactNode;
	readonly placement: "over" | "below";
}

const HEADING = "cv:m-0 cv:px-2.5 cv:pt-1 cv:pb-1.5 cv:text-sm cv:font-medium cv:text-muted-foreground";
const NEW_TAB = "New tab";

export function NewTabMenu({ trigger, placement }: NewTabMenuProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const { apps } = useQuery(AppTabsQuery).data;
	const openTab = useCommand(OpenTabCommand);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} placement={placement} isPortaled trigger={trigger}>
			<div data-host-new-tab-menu="">
				<p className={HEADING}>{NEW_TAB}</p>
				{apps.map((choice) => (
					<PopoverItem
						key={choice.app}
						onClick={() => {
							setOpen(false);
							void openTab.run({ app: choice.app });
						}}
						data-host-new-tab={choice.app}
					>
						<Icon name={choice.icon} size={16} />
						{choice.label}
					</PopoverItem>
				))}
			</div>
		</Popover>
	);
}
