import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { TOP_BAR_HEIGHT } from "@widgetarium/canvas";
import { Slot } from "@widgetarium/core/requests";
import { AddAppButton } from "../add-app-button/add-app-button.js";
import { AppTabs } from "../../../features/tabs/ui/app-tabs/app-tabs.js";
import { ClosePanelButton } from "../../../features/panel/ui/close-panel/close-panel.js";
import { HOST_BAR_CONTAINER } from "../../lib/host-bar-steps/host-bar-steps.js";

export interface AppHostBarProps {
	readonly appZone: ReactNode;
	readonly cornerEnd?: ReactNode;
}

const BAR = `${TOP_BAR_HEIGHT} ${HOST_BAR_CONTAINER} cv:flex cv:flex-none cv:flex-row cv:items-center cv:justify-between cv:gap-1.5`;
const APP_ZONE = "cv:@container cv:flex cv:min-w-0 cv:flex-1 cv:items-center cv:gap-1.5 cv:ps-1.5";
const HOST_ZONE = "cv:flex cv:flex-none cv:items-center cv:gap-1.5";
const CORNER = "cv:flex cv:h-[var(--wg-studio-band,50px)] cv:items-center cv:gap-parts";

export function AppHostBar({ appZone, cornerEnd }: AppHostBarProps): ReactElement {
	return (
		<div className={BAR} data-app-host-bar="">
			<div className={APP_ZONE} data-app-zone="">
				{appZone}
			</div>
			<div className={HOST_ZONE} data-host-zone="">
				<Slot loading={null}>
					<AppTabs />
				</Slot>
				<AddAppButton />
				<ClosePanelButton />
				{cornerEnd ? <div className={CORNER}>{cornerEnd}</div> : null}
			</div>
		</div>
	);
}
