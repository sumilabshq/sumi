import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { AppFacesQuery } from "@widgetarium/app-host";
import { useCommand, useOptionalQuery, useQuery } from "@widgetarium/framework";
import { AppTabQuery, GoBackInTabCommand, GoForwardInTabCommand } from "@widgetarium/places";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";
import { PlateHeaderPart } from "../../../plate/ui/plate-header/plate-header-part.js";
import { AppCrumb } from "./app-crumb.js";

export interface AppHeaderProps {
	readonly app: string;
	readonly tabId: string;
}

const HOME_ADDRESS = "";

export function AppHeader({ app, tabId }: AppHeaderProps): ReactElement | null {
	const tab = useOptionalQuery(AppTabQuery, { id: tabId }).data;
	const { faces } = useQuery(AppFacesQuery).data;
	const goBack = useCommand(GoBackInTabCommand);
	const goForward = useCommand(GoForwardInTabCommand);

	if (tab === null) {
		return null;
	}

	const canGoBack = tab.canGoBack === true;
	const canGoForward = tab.canGoForward === true;
	return (
		<Fragment>
			<PlateHeaderPart place="lead">
				<HeaderButton
					label="Back"
					icon="chevron-left"
					isOff={!canGoBack}
					data-app-back=""
					onClick={() => canGoBack && void goBack.run({ id: tabId })}
				/>
				<HeaderButton
					label="Forward"
					icon="chevron-right"
					isOff={!canGoForward}
					data-app-forward=""
					onClick={() => canGoForward && void goForward.run({ id: tabId })}
				/>
			</PlateHeaderPart>
			<PlateHeaderPart place="crumb">
				<AppCrumb
					tabId={tabId}
					appTitle={faces.find((face) => face.app === app)?.title ?? app}
					pageTitle={tab.address === HOME_ADDRESS || tab.address === null ? null : (tab.title ?? tab.address)}
				/>
			</PlateHeaderPart>
		</Fragment>
	);
}
