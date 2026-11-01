import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AppPage } from "../features/app-frame/ui/app-page/app-page.js";

export interface ChatPageProps {
	readonly chatId: string;
}

const CHAT_APP = "chat";

export function ChatPage({ chatId }: ChatPageProps): ReactElement {
	return <AppPage key={chatId} app={CHAT_APP} tabId={chatId} />;
}
