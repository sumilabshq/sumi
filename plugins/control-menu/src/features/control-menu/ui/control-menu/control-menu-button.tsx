import { createElement as h, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Popover, PopoverContent } from "@widgetarium/kit";
import { ControlMenuContext } from "../../lib/control-menu-context.js";
import type { ControlMenuHandle } from "../../lib/control-menu-context.js";
import { ControlMenuList } from "./control-menu-list.js";
import { ControlMenuTrigger } from "./control-menu-trigger.js";

export function ControlMenuButton(): ReactNode {
	const [isOpen, setOpen] = useState(false);
	const menu = useMemo<ControlMenuHandle>(
		() => ({
			close: () => setOpen(false),
		}),
		[],
	);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<ControlMenuTrigger />
			<PopoverContent side="bottom" align="end" className="sumi-control-menu-pop">
				<ControlMenuContext.Provider value={menu}>
					<ControlMenuList />
				</ControlMenuContext.Provider>
			</PopoverContent>
		</Popover>
	);
}
