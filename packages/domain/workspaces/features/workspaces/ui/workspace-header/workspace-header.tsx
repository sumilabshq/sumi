import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Button, Icon, Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@widgetarium/kit";
import { useQuery } from "@widgetarium/core/requests";
import { WorkspacesQuery } from "../../contract.js";
import { WorkspaceLook } from "../workspace-look/workspace-look.js";
import { WorkspaceMenu } from "./workspace-menu.js";

const MENU_BELOW_PX = 12;
const LOOK_BELOW_PX = 6;
const LOOK_START_PX = 6;
const CHEVRON_PX = 14;

export function WorkspaceHeader(): ReactElement {
	const { current } = useQuery(WorkspacesQuery).data;
	const [isMenuOpen, setMenuOpen] = useState(false);
	const [isLookOpen, setLookOpen] = useState(false);
	const openLook = (): void => {
		setMenuOpen(false);
		setLookOpen(true);
	};
	return (
		<Popover open={isLookOpen} onOpenChange={setLookOpen} isPortaled className="wg-ws-pick">
			<PopoverAnchor asChild>
				<div className="wg-ws-head">
					<Popover open={isMenuOpen} onOpenChange={setMenuOpen} isPortaled className="wg-ws-pop wg-ws-menu">
						<PopoverTrigger asChild>
							<Button variant="ghost" className="wg-ws-name" data-ws-name="">
								<span className="wg-ws-name-text">{current.name}</span>
								<Icon name="chevron-down" size={CHEVRON_PX} />
							</Button>
						</PopoverTrigger>
						<PopoverContent side="bottom" align="start" sideOffset={MENU_BELOW_PX}>
							<WorkspaceMenu onChosen={() => setMenuOpen(false)} onNameAndIcon={openLook} />
						</PopoverContent>
					</Popover>
				</div>
			</PopoverAnchor>
			<PopoverContent side="bottom" align="start" sideOffset={LOOK_BELOW_PX} alignOffset={LOOK_START_PX}>
				<WorkspaceLook workspace={current} />
			</PopoverContent>
		</Popover>
	);
}
