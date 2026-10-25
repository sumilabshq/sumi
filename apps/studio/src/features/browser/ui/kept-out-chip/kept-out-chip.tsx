import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { Popover } from "@widgetarium/kit";
import { SiteAccessQuery } from "@widgetarium/browser";
import { useHeldTab } from "../../lib/held-tab.js";
import { SiteAccessPanel } from "../site-menu/site-access-panel.js";
import { KeptOutPress } from "./kept-out-press.js";

export function KeptOutChip(): ReactElement | null {
	const [isOpen, setIsOpen] = useState(false);
	const { shown, isKeptOut } = useQuery(SiteAccessQuery, { heldTabId: useHeldTab() }).data;

	if (shown === null || !isKeptOut) {
		return null;
	}

	return (
		<Popover
			open={isOpen}
			onOpenChange={setIsOpen}
			placement="below"
			isPortaled
			trigger={<KeptOutPress host={shown.siteKey} />}
		>
			<SiteAccessPanel />
		</Popover>
	);
}
