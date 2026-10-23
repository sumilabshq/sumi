import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { AssistantPanel } from "@widgetarium/assistant";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { HeaderButton, Plate } from "@widgetarium/shell";
import { chatCardsOver } from "../assistant/chat-cards.js";

export interface ChatPlateProps {
	readonly chatApp: StartedApp;
	readonly assistant: AssistantPort;
	readonly crumb: ReactNode;
	readonly more: ReactNode;
}

const CHAT_LABEL = "Chat";
const HIDE_CHATS = "Hide chats";

export function ChatPlate({ chatApp, assistant, crumb, more }: ChatPlateProps): ReactElement {
	const [cards] = useState(() => chatCardsOver(assistant));
	return (
		<Plate
			side="chat"
			label={CHAT_LABEL}
			edgeStart={<HeaderButton label={HIDE_CHATS} icon="panel-left" isInert />}
			lead={null}
			crumb={crumb}
			more={more}
			edgeEnd={null}
		>
			<div className="wg-studio-chat">
				<AppProvider app={chatApp}>
					<AssistantPanel cards={cards} />
				</AppProvider>
			</div>
		</Plate>
	);
}
