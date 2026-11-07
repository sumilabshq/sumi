import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import type { AppView, TabModulesOf, TitleOf } from "../../../../slots.js";

export interface FilledApp {
	readonly id: string;
	readonly title: string;
	readonly icon?: string | undefined;
	readonly art?: string | undefined;
	readonly isListed?: boolean | undefined;
	readonly view?: AppView | undefined;
	readonly actions?: readonly AppView[] | undefined;
	readonly tabModules?: TabModulesOf | undefined;
	readonly titleOf?: TitleOf | undefined;
}

export interface DrawnApp extends FilledApp {
	readonly view: AppView;
}

export interface AppTabProps {
	readonly filled: DrawnApp;
	readonly tabId: string;
}

const NO_ACTIONS: readonly AppView[] = [];

export function AppTab({ filled, tabId }: AppTabProps): ReactElement {
	const View = filled.view;
	const { Actions } = useTabHeader();
	return (
		<Fragment>
			<Actions>
				{(filled.actions ?? NO_ACTIONS).map((Action, at) => (
					<Action key={at} tabId={tabId} />
				))}
			</Actions>
			<View tabId={tabId} />
		</Fragment>
	);
}
