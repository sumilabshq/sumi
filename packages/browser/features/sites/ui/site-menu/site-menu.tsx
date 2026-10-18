import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { RoundButton } from "@widgetarium/canvas";
import { Icon, Popover } from "@widgetarium/kit";
import { SiteAccessPanel } from "./site-access-panel.js";

const MENU_LABEL = "Site access";

export function SiteMenu(): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const trigger = (
		<RoundButton label={MENU_LABEL} tone="raise" size="l">
			<Icon name="ellipsis" size={18} />
		</RoundButton>
	);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} placement="below" isPortaled trigger={trigger}>
			<SiteAccessPanel />
		</Popover>
	);
}
