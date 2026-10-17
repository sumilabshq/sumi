import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Slot } from "@widgetarium/core/requests";
import { AddressField } from "../../../features/tabs/ui/address-field/address-field.js";
import { BrowserNav } from "../../../features/tabs/ui/browser-nav/browser-nav.js";
import { SiteMenu } from "../../../features/sites/ui/site-menu/site-menu.js";

const ZONE = "cv:flex cv:min-w-0 cv:items-center cv:gap-1.5";

export function BrowserAppZone(): ReactElement {
	return (
		<Slot loading={null}>
			<span className={ZONE} data-browser-app-zone="">
				<BrowserNav />
				<AddressField />
				<SiteMenu />
			</span>
		</Slot>
	);
}
