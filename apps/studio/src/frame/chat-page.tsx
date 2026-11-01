import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { AppFacesQuery } from "@widgetarium/app-host";
import { InstalledAppPage } from "../features/app-frame/ui/installed-app-page/installed-app-page.js";
import { appPageOf } from "./app-page-of.js";

export interface ChatPageProps {
	readonly chatId: string;
	readonly renderBuiltIn: () => ReactElement;
}

const CHAT_APP = "chat";

export function ChatPage({ chatId, renderBuiltIn }: ChatPageProps): ReactElement {
	const { faces } = useQuery(AppFacesQuery).data;
	return appPageOf({
		app: CHAT_APP,
		faces,
		builtIn: {
			chat: renderBuiltIn,
		},
		installed: () => <InstalledAppPage key={chatId} app={CHAT_APP} tabId={chatId} isShown />,
	});
}
