import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Slot } from "@widgetarium/core/requests";
import { AddPhoto } from "../../../features/photos/ui/add-photo/add-photo.js";
import { PagePicker } from "../../../features/pages/ui/page-picker/page-picker.js";
import { SidebarToggle } from "../../../features/layers/ui/sidebar-toggle/sidebar-toggle.js";
import { VariantSwitch } from "../../../features/pages/ui/variant-switch/variant-switch.js";
import { ZoomLabel } from "../../../features/view/ui/zoom-label/zoom-label.js";
import { TitlePill } from "../title-pill/title-pill.js";

const ZONE = "cv:flex cv:min-w-0 cv:items-center cv:gap-1.5";

export function CanvasAppZone(): ReactElement {
	return (
		<Slot loading={null}>
			<span className={ZONE} data-canvas-app-zone="">
				<SidebarToggle />
				<TitlePill>
					<PagePicker />
					<AddPhoto />
				</TitlePill>
				<VariantSwitch />
				<ZoomLabel />
				{/* TODO: bring the mode switch back */}
			</span>
		</Slot>
	);
}
