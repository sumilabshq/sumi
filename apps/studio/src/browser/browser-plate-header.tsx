import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { GoBackCommand, GoForwardCommand, PageHeadQuery } from "@widgetarium/browser";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { useHeldTab } from "../features/browser/lib/held-tab.js";
import { KeptOutChip } from "../features/browser/ui/kept-out-chip/kept-out-chip.js";
import { HeaderButton } from "../features/plate/ui/plate-header/header-button.js";
import { PlateCrumb } from "../features/plate/ui/plate-header/plate-crumb.js";
import { PlateHeaderPart } from "../features/plate/ui/plate-header/plate-header-part.js";
import { PlateTint } from "../features/plate/ui/plate-header/plate-tint.js";

export function BrowserPlateHeader(): ReactElement | null {
	const heldTabId = useHeldTab();
	const head = useQuery(PageHeadQuery, { heldTabId }).data;
	const goBack = useCommand(GoBackCommand);
	const goForward = useCommand(GoForwardCommand);

	if (head === null) {
		return null;
	}

	return (
		<Fragment>
			<PlateTint look={head.look} />
			<PlateHeaderPart place="lead">
				<HeaderButton
					label="Back"
					icon="chevron-left"
					isOff={!head.canGoBack}
					onClick={() => head.canGoBack && void goBack.run({ tabId: head.tabId })}
				/>
				<HeaderButton
					label="Forward"
					icon="chevron-right"
					isOff={!head.canGoForward}
					onClick={() => head.canGoForward && void goForward.run({ tabId: head.tabId })}
				/>
			</PlateHeaderPart>
			<PlateHeaderPart place="crumb">
				<PlateCrumb words={{ first: head.site, second: head.title }} isPressable pageId={heldTabId} />
			</PlateHeaderPart>
			<PlateHeaderPart place="controls">
				<KeptOutChip />
			</PlateHeaderPart>
		</Fragment>
	);
}
