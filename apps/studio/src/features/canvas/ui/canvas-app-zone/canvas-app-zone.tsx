import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Slot } from "@widgetarium/core/requests";
import { AddPhoto } from "../add-photo/add-photo.js";
import { PagePicker } from "../page-picker/page-picker.js";
import { SidebarToggle } from "../sidebar-toggle/sidebar-toggle.js";
import { VariantSwitch } from "../variant-switch/variant-switch.js";
import { ZoomLabel } from "../zoom-label/zoom-label.js";
import { TitlePill } from "../title-pill/title-pill.js";
import { TopBarLookContext } from "../../lib/top-bar-look-context.js";
import type { TopBarLook } from "../../lib/top-bar-look-context.js";

export interface CanvasAppZoneProps {
	readonly look?: TopBarLook;
}

const ZONE: Readonly<Record<TopBarLook, string>> = {
	raised: "cv:flex cv:min-w-0 cv:items-center cv:gap-1.5",
	ghost: "cv:flex cv:min-w-0 cv:shrink-[100] cv:items-center cv:gap-[var(--sumi-sp-1)] cv:overflow-hidden",
};

export function CanvasAppZone({ look = "raised" }: CanvasAppZoneProps): ReactElement {
	return (
		<TopBarLookContext.Provider value={look}>
			<Slot loading={null}>
				<span className={ZONE[look]} data-canvas-app-zone="">
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
		</TopBarLookContext.Provider>
	);
}
