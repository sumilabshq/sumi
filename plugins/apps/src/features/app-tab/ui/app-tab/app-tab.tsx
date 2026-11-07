import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import type { AppView, TabModulesOf } from "../../../../slots.js";
import { useRecordsAppTab } from "../../lib/use-records-app-tab.js";

export interface FilledApp {
	readonly id: string;
	readonly title: string;
	readonly icon: string;
	readonly view: AppView;
	readonly actions?: readonly AppView[] | undefined;
	readonly tabModules?: TabModulesOf | undefined;
}

export interface AppTabProps {
	readonly filled: FilledApp;
	readonly tabId: string;
}

const NO_ACTIONS: readonly AppView[] = [];

export function AppTab({ filled, tabId }: AppTabProps): ReactElement {
	const View = filled.view;
	const { Actions } = useTabHeader();
	useRecordsAppTab(filled, tabId);
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
