import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NewTabPage } from "./new-tab-page.js";
import { useRecordsTitle } from "../../../../shared/lib/use-records-title.js";
import { webAddressOf } from "../../lib/web-address.js";

export interface NewTabViewProps {
	readonly tabId: string;
	readonly navigate: (address: string) => void;
}

const NEW_TAB_TITLE = "New tab";

export function NewTabView({ tabId, navigate }: NewTabViewProps): ReactElement {
	useRecordsTitle(tabId, NEW_TAB_TITLE);
	return <NewTabPage onOpen={(typed) => navigate(webAddressOf(typed))} />;
}
