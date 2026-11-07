import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppView } from "../../../../slots.js";
import { useRecordsAppTab } from "../../lib/use-records-app-tab.js";

export interface FilledApp {
	readonly id: string;
	readonly title: string;
	readonly icon: string;
	readonly view: AppView;
}

export interface AppTabProps {
	readonly filled: FilledApp;
	readonly tabId: string;
}

export function AppTab({ filled, tabId }: AppTabProps): ReactElement {
	const View = filled.view;
	useRecordsAppTab(filled, tabId);
	return <View tabId={tabId} />;
}
