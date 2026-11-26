import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { apps as appsContract } from "@sumi/apps/contract";
import { TrailButtons } from "@sumi/flows-sidebar-plugin";
import { useOptionalQuery, useQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import { PlateCrumb } from "../../../plate/ui/plate-header/plate-crumb.js";
import { PlateHeaderPart } from "../../../plate/ui/plate-header/plate-header-part.js";
import { AppActions } from "./app-actions.js";

export interface AppHeaderProps {
	readonly app: string;
	readonly tabId: string;
}

const HOME_ADDRESS = "";

export function AppHeader({ app, tabId }: AppHeaderProps): ReactElement | null {
	const tab = useOptionalQuery(navigation.tabFacts.ownAppTab, { id: tabId }).data;
	const { apps } = useQuery(appsContract.apps.all).data;
	const pageTitle = useOptionalQuery(appsContract.pages.pageOfTab, { id: tabId }).data?.title ?? null;

	if (tab === null) {
		return null;
	}

	return (
		<Fragment>
			<PlateHeaderPart place="lead">
				<TrailButtons />
			</PlateHeaderPart>
			<PlateHeaderPart place="crumb">
				<PlateCrumb
					words={{
						first: apps.find(({ id }) => id === app)?.title ?? app,
						second: pageWordOf(tab.address, pageTitle),
					}}
					isPressable
				/>
			</PlateHeaderPart>
			<PlateHeaderPart place="controls">
				<AppActions tabId={tabId} />
			</PlateHeaderPart>
		</Fragment>
	);
}

function pageWordOf(address: string | null, pageTitle: string | null): string | null {
	if (address === HOME_ADDRESS || address === null) {
		return null;
	}

	return pageTitle ?? address;
}
