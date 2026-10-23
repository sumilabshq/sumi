import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { GoBackCommand, GoForwardCommand, PageHeadQuery } from "@widgetarium/browser";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { HeaderButton, PlateCrumb, PlateHeaderPart, PlateTint } from "@widgetarium/shell";

export function BrowserPlateHeader(): ReactElement | null {
	const head = useQuery(PageHeadQuery).data;
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
				<PlateCrumb words={{ first: head.site, second: head.title }} isPressable />
			</PlateHeaderPart>
		</Fragment>
	);
}
