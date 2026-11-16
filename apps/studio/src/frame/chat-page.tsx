import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import { AppPage } from "../features/app-frame/ui/app-page/app-page.js";

export interface ChatPageProps {
	readonly chatId: string;
}

export function ChatPage({ chatId }: ChatPageProps): ReactElement | null {
	const tab = useOptionalQuery(navigation.tabFacts.ownAppTab, {
		id: chatId,
	}).data;

	if (tab === null) {
		return null;
	}

	return <AppPage key={chatId} app={tab.app} tabId={chatId} />;
}
